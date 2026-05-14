"""QA_REVIEW node: validates evidence sufficiency; blocks report if evidence == 0."""
from __future__ import annotations
import logging
from app.agents.state import ResearchState

logger = logging.getLogger(__name__)

MINIMUM_EVIDENCE_COUNT = 1


async def qa_node(state: ResearchState) -> dict:
    evidence_count = state.get("total_evidence_count", 0)
    logger.info("[QA] task_id=%s evidence_count=%d", state["task_id"], evidence_count)

    if evidence_count < MINIMUM_EVIDENCE_COUNT:
        reason = f"QA拦截：采集到的有效证据数为 {evidence_count}，低于最低要求 {MINIMUM_EVIDENCE_COUNT}。"
        logger.warning("[QA] FAILED — %s", reason)
        return {"qa_passed": False, "qa_failure_reason": reason}

    return {"qa_passed": True, "qa_failure_reason": ""}


def route_after_qa(state: ResearchState) -> str:
    """LangGraph conditional edge: route to 'writer' or 'failed_collection'."""
    return "writer" if state.get("qa_passed") else "failed_collection"
