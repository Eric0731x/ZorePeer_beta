"""ANALYZING node: maps raw search results onto analysis dimensions."""
from __future__ import annotations
import json
import logging
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.agents.state import ResearchState, Dimension
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_llm = ChatOpenAI(
    model="deepseek-chat",
    base_url=settings.deepseek_base_url,
    api_key=settings.deepseek_api_key,
    temperature=0.1,
)

_SYSTEM_PROMPT = """你是竞品分析师。根据搜索结果，为每个分析维度提取关键证据，并生成简短摘要。

输出 JSON 数组，每个维度格式：
{"name": "...", "evidence": ["来源1原文片段", ...], "summary": "一句话总结"}
"""


async def analyzer_node(state: ResearchState) -> dict:
    logger.info("[ANALYZER] task_id=%s results=%d", state["task_id"], len(state["raw_search_results"]))

    snippets = "\n---\n".join(
        f"[{r.get('url','')}]\n{r.get('content','')[:500]}"
        for r in state["raw_search_results"][:20]
    )
    dimensions_json = json.dumps([d["name"] for d in state["dimensions"]], ensure_ascii=False)
    human_msg = f"竞品：{state['competitor_name']}\n维度列表：{dimensions_json}\n\n搜索结果：\n{snippets}"

    response = await _llm.ainvoke([SystemMessage(content=_SYSTEM_PROMPT), HumanMessage(content=human_msg)])

    try:
        filled: list[Dimension] = json.loads(response.content)
    except (json.JSONDecodeError, AttributeError) as exc:
        logger.error("[ANALYZER] JSON parse error: %s", exc)
        filled = state["dimensions"]

    total_evidence = sum(len(d.get("evidence", [])) for d in filled)
    logger.info("[ANALYZER] total evidence items: %d", total_evidence)
    return {"filled_dimensions": filled, "total_evidence_count": total_evidence}
