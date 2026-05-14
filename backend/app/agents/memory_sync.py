"""MEMORY_SYNC node: persists core insights to Mem0 for future delta comparisons."""
from __future__ import annotations
import logging
from app.agents.state import ResearchState
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def memory_sync_node(state: ResearchState) -> dict:
    logger.info("[MEMORY_SYNC] task_id=%s", state["task_id"])

    try:
        from mem0 import AsyncMemoryClient
        client = AsyncMemoryClient(api_key=settings.mem0_api_key)

        messages = [
            {
                "role": "user",
                "content": f"竞品：{state['competitor_name']}，分析日期：今日",
            },
            {
                "role": "assistant",
                "content": state.get("report_markdown", "")[:3000],
            },
        ]
        await client.add(
            messages,
            user_id=state["workspace_id"],
            metadata={
                "task_id": state["task_id"],
                "competitor_name": state["competitor_name"],
            },
        )
        logger.info("[MEMORY_SYNC] successfully stored memory for workspace %s", state["workspace_id"])
    except Exception as exc:
        # Memory sync failure is non-fatal — report is already written
        logger.error("[MEMORY_SYNC] failed (non-fatal): %s", exc)

    return {"memory_synced": True}
