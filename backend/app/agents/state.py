from __future__ import annotations
from typing import Any
from typing_extensions import TypedDict


class SearchQuery(TypedDict):
    query: str
    source: str  # e.g. "web", "news"


class Dimension(TypedDict):
    name: str          # e.g. "价格", "新功能"
    evidence: list[str]
    summary: str


class ResearchState(TypedDict):
    # ── Identity ──────────────────────────────────────────────────
    task_id: str
    workspace_id: str
    competitor_name: str
    focus_areas: list[str]

    # ── PLANNING outputs ─────────────────────────────────────────
    search_queries: list[SearchQuery]
    dimensions: list[Dimension]

    # ── COLLECTING outputs ────────────────────────────────────────
    raw_search_results: list[dict[str, Any]]  # Tavily result dicts

    # ── ANALYZING outputs ─────────────────────────────────────────
    filled_dimensions: list[Dimension]
    total_evidence_count: int

    # ── QA_REVIEW outputs ─────────────────────────────────────────
    qa_passed: bool
    qa_failure_reason: str

    # ── WRITING outputs ───────────────────────────────────────────
    report_markdown: str

    # ── MEMORY_SYNC outputs ───────────────────────────────────────
    memory_synced: bool

    # ── Error tracking ────────────────────────────────────────────
    error_reason: str
    langsmith_trace_id: str
