"""PLANNING node: generates search queries and analysis dimensions from user intent."""
from __future__ import annotations
import json
import logging
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.agents.state import ResearchState, SearchQuery, Dimension
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_llm = ChatOpenAI(
    model="deepseek-chat",
    base_url=settings.deepseek_base_url,
    api_key=settings.deepseek_api_key,
    temperature=0.3,
)

_SYSTEM_PROMPT = """你是一名竞品分析专家。根据用户提供的竞品名称和关注维度，生成：
1. 5-8个精准的搜索查询词（中英混合，覆盖不同角度）
2. 对应的分析维度列表

输出严格遵循 JSON 格式：
{
  "search_queries": [
    {"query": "...", "source": "web"}
  ],
  "dimensions": [
    {"name": "...", "evidence": [], "summary": ""}
  ]
}
"""


async def planner_node(state: ResearchState) -> dict:
    logger.info("[PLANNER] task_id=%s competitor=%s", state["task_id"], state["competitor_name"])

    focus_str = "、".join(state.get("focus_areas") or []) or "综合竞品分析"
    human_msg = f"竞品名称：{state['competitor_name']}\n关注维度：{focus_str}"

    response = await _llm.ainvoke([SystemMessage(content=_SYSTEM_PROMPT), HumanMessage(content=human_msg)])

    try:
        data = json.loads(response.content)
        search_queries: list[SearchQuery] = data.get("search_queries", [])
        dimensions: list[Dimension] = data.get("dimensions", [])
    except (json.JSONDecodeError, AttributeError) as exc:
        logger.error("[PLANNER] JSON parse error: %s", exc)
        search_queries = [{"query": f"{state['competitor_name']} 产品评测", "source": "web"}]
        dimensions = [{"name": "综合", "evidence": [], "summary": ""}]

    return {
        "search_queries": search_queries,
        "dimensions": dimensions,
    }
