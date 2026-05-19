"""
Web search agent — queries Tavily and converts results directly into
Claim objects. No LLM JSON parsing step — faster and more reliable.
"""
import os
import json
from datetime import datetime, timezone
from typing import List

from app.core.config import settings
os.environ["GROQ_API_KEY"]   = settings.groq_api_key
os.environ["TAVILY_API_KEY"] = settings.tavily_api_key

from tavily import TavilyClient
from app.agents.state import ResearchState, Claim, TraceEvent

client = TavilyClient(api_key=settings.tavily_api_key)


def web_search_node(state: ResearchState) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    all_claims: List[Claim] = []
    errors = []

    sub_queries = state.get("sub_queries") or [state["query"]]

    for sub_query in sub_queries[:3]:
        try:
            results = client.search(
                query=sub_query,
                max_results=state.get("max_sources", 5),
                search_depth="basic",
            )
            for r in results.get("results", []):
                content = r.get("content") or r.get("snippet") or ""
                title   = r.get("title",   "Unknown source")
                url     = r.get("url",     "")
                score   = float(r.get("score", 0.6))

                if not content.strip():
                    continue

                sentences = [s.strip() for s in content.replace("\n", " ").split(". ") if len(s.strip()) > 30]
                for sentence in sentences[:2]:
                    claim: Claim = {
                        "text":         sentence + ("." if not sentence.endswith(".") else ""),
                        "confidence":   min(score, 0.95),
                        "source_url":   url,
                        "source_title": title,
                        "source_type":  "web",
                        "agent":        "web_search",
                    }
                    all_claims.append(claim)

        except Exception as e:
            errors.append(str(e))

    avg_confidence = (
        sum(c["confidence"] for c in all_claims) / len(all_claims)
        if all_claims else 0.0
    )

    detail = f"Retrieved {len(all_claims)} claims from web search"
    if errors:
        detail += f" · error: {errors[0][:100]}"

    trace_event: TraceEvent = {
        "node":       "web_search",
        "status":     "complete" if all_claims else "error",
        "detail":     detail,
        "timestamp":  now,
        "confidence": round(avg_confidence, 2),
    }

    return {
        "web_claims":      all_claims,
        "agents_complete": state.get("agents_complete", []) + ["web_search"],
        "trace":           [trace_event],
    }