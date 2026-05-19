"""
Supervisor agent — decomposes the query and routes to specialists.
"""
import os
import json
from datetime import datetime, timezone

from app.core.config import settings
os.environ["GROQ_API_KEY"] = settings.groq_api_key

from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from app.agents.state import ResearchState, TraceEvent


SUPERVISOR_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a research supervisor. Given a user query, produce a JSON object with two keys:
- "sub_queries": list of 2-4 focused sub-questions that together fully answer the main query
- "agents": list of agents to activate from ["web_search", "academic", "fact_check"]

Always include "web_search". Include "academic" only if the user has uploaded documents.
Include "fact_check" for queries involving statistics or contested facts.

Respond ONLY with valid JSON. No preamble, no markdown fences."""),
    ("human", "Query: {query}"),
])

llm = ChatGroq(model=settings.fast_model, temperature=0.1)


def supervisor_node(state: ResearchState) -> dict:
    now = datetime.now(timezone.utc).isoformat()

    try:
        chain = SUPERVISOR_PROMPT | llm
        response = chain.invoke({"query": state["query"]})
        raw = response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        plan = json.loads(raw.strip())
        sub_queries = plan.get("sub_queries", [state["query"]])
        agents = plan.get("agents", ["web_search"])
    except Exception as e:
        sub_queries = [state["query"]]
        agents = ["web_search", "fact_check"]

    return {
        "sub_queries":      sub_queries,
        "active_agents":    agents,
        "agents_complete":  [],
        "web_claims":       [],
        "academic_claims":  [],
        "factcheck_results":[],
        "trace": [{
            "node":      "supervisor",
            "status":    "complete",
            "detail":    f"Decomposed into {len(sub_queries)} sub-queries · activating: {', '.join(agents)}",
            "timestamp": now,
            "confidence": None,
        }],
    }