"""COLLECTING node: concurrently calls Tavily for each search query."""
from __future__ import annotations
import asyncio
import logging
from tavily import AsyncTavilyClient
from app.agents.state import ResearchState
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def _search_one(client: AsyncTavilyClient, query: str) -> list[dict]:
    try:
        result = await client.search(query=query, max_results=5, search_depth="advanced")
        return result.get("results", [])
    except Exception as exc:
        logger.warning("[COLLECTOR] query=%r failed: %s", query, exc)
        return []


async def collector_node(state: ResearchState) -> dict:
    logger.info("[COLLECTOR] task_id=%s queries=%d", state["task_id"], len(state["search_queries"]))

    client = AsyncTavilyClient(api_key=settings.tavily_api_key)
    tasks = [_search_one(client, sq["query"]) for sq in state["search_queries"]]
    results_per_query = await asyncio.gather(*tasks)

    raw_results: list[dict] = []
    for batch in results_per_query:
        raw_results.extend(batch)

    # Deduplicate by URL
    seen_urls: set[str] = set()
    deduped: list[dict] = []
    for item in raw_results:
        url = item.get("url", "")
        if url not in seen_urls:
            seen_urls.add(url)
            deduped.append(item)

    logger.info("[COLLECTOR] collected %d unique results", len(deduped))
    return {"raw_search_results": deduped}
