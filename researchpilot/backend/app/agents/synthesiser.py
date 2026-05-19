"""
Synthesiser agent — builds the final confidence-weighted research report.
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


SYNTHESIS_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a senior research analyst. Using the provided claims, write a comprehensive research report.

Rules:
- Use markdown: ## headings, bullet points for key findings
- Cite sources inline like [Source: title]
- End with a "## Key Takeaways" section with 3-5 bullets
- Only use information from the provided claims — do not hallucinate
- Flag any contradictions in a "## ⚠ Contested Findings" section

Target length: 400-600 words."""),
    ("human", """Research query: {query}

Claims (sorted by confidence):
{claims_text}

Contradictions detected:
{contradictions}

Write the report:"""),
])

llm = ChatGroq(model=settings.primary_model, temperature=0.3)


def synthesiser_node(state: ResearchState) -> dict:
    now = datetime.now(timezone.utc).isoformat()

    all_claims: List[Claim] = (
        state.get("web_claims", []) + state.get("academic_claims", [])
    )

    if not all_claims:
        return {
            "report": "## Research Incomplete\n\nNo information was retrieved for this query. Please check your Tavily API key is set correctly in `.env`, then try again.",
            "citations": [],
            "confidence_score": 0.0,
            "trace": [{
                "node": "synthesiser", "status": "error",
                "detail": "No claims available — web search returned empty results",
                "timestamp": now, "confidence": 0.0,
            }],
        }

    sorted_claims = sorted(all_claims, key=lambda c: c["confidence"], reverse=True)

    claims_text = "\n".join(
        f"[conf={c['confidence']:.2f}] [{c['source_type']}] {c['text']} (Source: {c['source_title']})"
        for c in sorted_claims[:25]
    )

    contradictions = state.get("contradictions", [])
    contradictions_text = "\n".join(f"- {c}" for c in contradictions) if contradictions else "None detected"

    try:
        chain = SYNTHESIS_PROMPT | llm
        response = chain.invoke({
            "query": state["query"],
            "claims_text": claims_text,
            "contradictions": contradictions_text,
        })
        report = response.content.strip()
    except Exception as e:
        report = f"## Error generating report\n\n{str(e)}"

    # Build deduplicated citations
    seen = set()
    citations = []
    for c in sorted_claims:
        key = c["source_url"] or c["source_title"]
        if key and key not in seen:
            seen.add(key)
            citations.append({
                "title":       c["source_title"],
                "url":         c["source_url"],
                "snippet":     c["text"][:200],
                "confidence":  c["confidence"],
                "source_type": c["source_type"],
            })

    top = sorted_claims[:10]
    confidence_score = sum(c["confidence"] for c in top) / len(top) if top else 0.0
    if contradictions:
        confidence_score *= max(0.7, 1.0 - 0.05 * len(contradictions))

    return {
        "report":           report,
        "citations":        citations,
        "confidence_score": round(confidence_score, 2),
        "trace": [{
            "node": "synthesiser", "status": "complete",
            "detail": f"Report generated · {len(citations)} citations · confidence {confidence_score:.0%}",
            "timestamp": now, "confidence": round(confidence_score, 2),
        }],
    }