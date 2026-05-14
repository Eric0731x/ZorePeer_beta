"""Compiles the LangGraph DAG and exposes run_research_graph() for the API layer."""
from __future__ import annotations
import asyncio
import logging
from langgraph.graph import StateGraph, END
from app.agents.state import ResearchState
from app.agents.planner import planner_node
from app.agents.collector import collector_node
from app.agents.analyzer import analyzer_node
from app.agents.qa import qa_node, route_after_qa
from app.agents.writer import writer_node
from app.agents.memory_sync import memory_sync_node
from app.models.task import TaskStatus

logger = logging.getLogger(__name__)

# ── Build the graph ────────────────────────────────────────────────────────────

_builder = StateGraph(ResearchState)

_builder.add_node("planner", planner_node)
_builder.add_node("collector", collector_node)
_builder.add_node("analyzer", analyzer_node)
_builder.add_node("qa", qa_node)
_builder.add_node("writer", writer_node)
_builder.add_node("memory_sync", memory_sync_node)

_builder.set_entry_point("planner")
_builder.add_edge("planner", "collector")
_builder.add_edge("collector", "analyzer")
_builder.add_edge("analyzer", "qa")
_builder.add_conditional_edges("qa", route_after_qa, {"writer": "writer", "failed_collection": END})
_builder.add_edge("writer", "memory_sync")
_builder.add_edge("memory_sync", END)

graph = _builder.compile()

# Node → TaskStatus mapping for DB persistence during execution
_NODE_STATUS_MAP: dict[str, TaskStatus] = {
    "planner": TaskStatus.PLANNING,
    "collector": TaskStatus.COLLECTING,
    "analyzer": TaskStatus.ANALYZING,
    "qa": TaskStatus.QA_REVIEW,
    "writer": TaskStatus.WRITING,
    "memory_sync": TaskStatus.MEMORY_SYNC,
}


async def _update_task_status(task_id: str, status: TaskStatus, **kwargs) -> None:
    """Persist task status into the database without holding a request-scoped session."""
    from app.database import AsyncSessionLocal
    from app.models.task import Task

    async with AsyncSessionLocal() as db:
        task = await db.get(Task, task_id)
        if task:
            task.status = status
            for key, value in kwargs.items():
                setattr(task, key, value)
            await db.commit()


async def run_research_graph(task_id: str) -> None:
    """Background entry-point: stream the graph and keep the DB in sync."""
    from app.database import AsyncSessionLocal
    from app.models.task import Task

    # Load task from DB to seed the initial state
    async with AsyncSessionLocal() as db:
        task = await db.get(Task, task_id)
        if not task:
            logger.error("[GRAPH] task %s not found", task_id)
            return
        import json as _json
        focus_areas = _json.loads(task.focus_areas or "[]")

    initial_state: ResearchState = {
        "task_id": task_id,
        "workspace_id": str(task.workspace_id),
        "competitor_name": task.competitor_name,
        "focus_areas": focus_areas,
        "search_queries": [],
        "dimensions": [],
        "raw_search_results": [],
        "filled_dimensions": [],
        "total_evidence_count": 0,
        "qa_passed": False,
        "qa_failure_reason": "",
        "report_markdown": "",
        "memory_synced": False,
        "error_reason": "",
        "langsmith_trace_id": "",
    }

    await _update_task_status(task_id, TaskStatus.PLANNING)

    try:
        async for event in graph.astream(initial_state):
            node_name = next(iter(event))
            node_output: dict = event[node_name]

            status = _NODE_STATUS_MAP.get(node_name)
            if status:
                await _update_task_status(task_id, status)

            # Persist QA failure immediately
            if node_name == "qa" and not node_output.get("qa_passed"):
                await _update_task_status(
                    task_id,
                    TaskStatus.FAILED_COLLECTION,
                    error_reason=node_output.get("qa_failure_reason", ""),
                )
                return

            # Persist completed report
            if node_name == "memory_sync":
                final_state: ResearchState = node_output  # type: ignore[assignment]
                report = initial_state.get("report_markdown", "")
                # Retrieve the latest merged state via last planner→writer chain
                # LangGraph streams partial states; we track report via the writer output
                # stored in event accumulation — read it from the accumulated state dict.
                await _update_task_status(
                    task_id,
                    TaskStatus.COMPLETED,
                    report_content=report,
                )

        # Final DB sync: re-read accumulated state from the last graph run result
        # (astream doesn't return the final merged state directly; do a final astream_log pass)
        final_result = await graph.ainvoke(initial_state)  # type: ignore[unused-ignore]
        await _update_task_status(
            task_id,
            TaskStatus.COMPLETED,
            report_content=final_result.get("report_markdown", ""),
        )

    except Exception as exc:
        logger.exception("[GRAPH] task %s crashed: %s", task_id, exc)
        await _update_task_status(task_id, TaskStatus.FAILED, error_reason=str(exc))
