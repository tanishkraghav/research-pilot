"""
Academic agent — RAG over uploaded documents using ChromaDB.
"""
import os
import json
from datetime import datetime, timezone
from typing import List

from app.core.config import settings
os.environ["GROQ_API_KEY"] = settings.groq_api_key

from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from app.agents.state import ResearchState, Claim, TraceEvent
from app.core.vector_store import vector_store


ACADEMIC_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a research analyst. Given document excerpts, extract factual claims as a JSON array.
Each item: {"text": "...", "confidence": 0.0-1.0, "source_title": "..."}
Return ONLY a valid JSON array. If nothing relevant, return []."""),
    ("human", "Query: {query}\n\nExcerpts:\n{excerpts}\n\nJSON array:"),
])

llm = ChatGroq(model=settings.fast_model, temperature=0.0)


def academic_node(state: ResearchState) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    all_claims: List[Claim] = []

    if "academic" not in state.get("active_agents", []):
        return {
            "academic_claims": [],
            "agents_complete": state.get("agents_complete", []) + ["academic"],
            "trace": [{
                "node": "academic", "status": "skipped",
                "detail": "No documents uploaded — skipping academic search",
                "timestamp": now, "confidence": None,
            }],
        }

    for sub_query in (state.get("sub_queries") or [state["query"]])[:3]:
        docs = vector_store.similarity_search(sub_query, k=4)
        if not docs:
            continue

        excerpts = "\n\n---\n\n".join(
            f"[{doc.metadata.get('filename','doc')}]\n{doc.page_content[:600]}"
            for doc in docs
        )

        try:
            chain = ACADEMIC_PROMPT | llm
            response = chain.invoke({"query": sub_query, "excerpts": excerpts})
            raw = response.content.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            for c in json.loads(raw.strip()):
                all_claims.append({
                    "text":         c.get("text", ""),
                    "confidence":   float(c.get("confidence", 0.6)),
                    "source_url":   "",
                    "source_title": c.get("source_title", "Uploaded document"),
                    "source_type":  "academic",
                    "agent":        "academic",
                })
        except Exception:
            pass

    avg = sum(c["confidence"] for c in all_claims) / len(all_claims) if all_claims else 0.0

    return {
        "academic_claims": all_claims,
        "agents_complete": state.get("agents_complete", []) + ["academic"],
        "trace": [{
            "node": "academic", "status": "complete",
            "detail": f"Retrieved {len(all_claims)} claims from indexed documents",
            "timestamp": now, "confidence": round(avg, 2),
        }],
    }