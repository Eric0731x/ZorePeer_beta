"""WRITING node: generates the final Markdown competitive intelligence report."""
from __future__ import annotations
import json
import logging
from datetime import date
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.agents.state import ResearchState
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_llm = ChatOpenAI(
    model="deepseek-chat",
    base_url=settings.deepseek_base_url,
    api_key=settings.deepseek_api_key,
    temperature=0.5,
)

_SYSTEM_PROMPT = """你是一名专业的竞品研究报告撰写者。请根据分析维度的证据，撰写一份结构化的竞品情报报告。

报告要求：
- 使用 Markdown 格式
- 包含执行摘要（Executive Summary）
- 每个维度单独成章，引用具体证据
- 末尾附上"关键洞察"和"建议行动"两个章节
- 语言简洁专业，避免废话
"""


async def writer_node(state: ResearchState) -> dict:
    logger.info("[WRITER] task_id=%s dimensions=%d", state["task_id"], len(state["filled_dimensions"]))

    dimensions_text = json.dumps(state["filled_dimensions"], ensure_ascii=False, indent=2)
    human_msg = (
        f"# 竞品：{state['competitor_name']}\n"
        f"报告日期：{date.today().isoformat()}\n\n"
        f"分析维度数据：\n{dimensions_text}"
    )

    response = await _llm.ainvoke([SystemMessage(content=_SYSTEM_PROMPT), HumanMessage(content=human_msg)])
    report_markdown: str = response.content or ""

    logger.info("[WRITER] report length=%d chars", len(report_markdown))
    return {"report_markdown": report_markdown}
