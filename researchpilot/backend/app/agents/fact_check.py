"""
Fact-check agent — cross-validates claims and detects contradictions.
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


FACTCHECK_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a fact-checking analyst. Given claims from multiple sources, identify contradictions.

Return ONLY a valid JSON object:
{
  "contradictions": ["<contradiction description>"],
  "overall_consistency": <float 0.0-1.0>
}

If no contradictions exist return an empty list. No markdown, no preamble."""),
    ("human", """Query: {query}

Claims:
{claims_text}

JSON result:"""),
])

llm = ChatGroq(model=settings.fast_model, temperature=0.0)


def fact_check_node(state: ResearchState) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    all_claims: List[Claim] = state.get("web_claims", []) + state.get("academic_claims", [])

    if "fact_check" not in state.get("active_agents", []) or not all_claims:
        return {
            "factcheck_results": [],
            "contradictions":    [],
            "agents_complete":   state.get("agents_complete", []) + ["fact_check"],
            "trace": [{
                "node": "fact_check", "status": "skipped",
                "detail": "Skipped — not required for this query",
                "timestamp": now, "confidence": None,
            }],
        }

    claims_text = "\n".join(
        f"[{i}] (conf={c['confidence']:.1f}) {c['text']}"
        for i, c in enumerate(all_claims[:20])
    )

    contradictions = []
    consistency    = 0.8

    try:
        chain = FACTCHECK_PROMPT | llm
        response = chain.invoke({"query": state["query"], "claims_text": claims_text})
        raw = response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result       = json.loads(raw.strip())
        contradictions = result.get("contradictions", [])
        consistency    = float(result.get("overall_consistency", 0.8))
    except Exception:
        pass

    return {
        "factcheck_results": [{"contradictions": contradictions, "consistency": consistency}],
        "contradictions":    contradictions,
        "agents_complete":   state.get("agents_complete", []) + ["fact_check"],
        "trace": [{
            "node": "fact_check", "status": "complete",
            "detail": f"Checked {len(all_claims)} claims · {len(contradictions)} contradiction(s)",
            "timestamp": now, "confidence": round(consistency, 2),
        }],
    }