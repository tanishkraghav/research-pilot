"""
LangGraph pipeline — wires supervisor + specialists into a compiled graph.

Flow:
  supervisor → [web_search, academic, fact_check] (parallel) → synthesiser → END

The graph uses conditional routing: the supervisor decides which specialist
agents to activate, so not all three run on every query.
"""
from langgraph.graph import StateGraph, END

from app.agents.state import ResearchState
from app.agents.supervisor import supervisor_node
from app.agents.web_search import web_search_node
from app.agents.academic import academic_node
from app.agents.fact_check import fact_check_node
from app.agents.synthesiser import synthesiser_node


def should_run_academic(state: ResearchState) -> str:
    return "academic" if "academic" in state.get("active_agents", []) else "skip_academic"



def build_graph():
    graph = StateGraph(ResearchState)

    # Register all nodes
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("web_search", web_search_node)
    graph.add_node("academic", academic_node)
    graph.add_node("fact_check", fact_check_node)
    graph.add_node("synthesiser", synthesiser_node)

    # Always start with supervisor
    graph.set_entry_point("supervisor")

    # Supervisor always routes to web_search (mandatory)
    graph.add_edge("supervisor", "web_search")

    # After web_search, conditionally run academic
    graph.add_conditional_edges(
        "web_search",
        should_run_academic,
        {"academic": "academic", "skip_academic": "fact_check"},
    )

    # After academic (or skip), run fact_check
    graph.add_edge("academic", "fact_check")

    # After fact_check, always synthesise
    graph.add_edge("fact_check", "synthesiser")

    # Synthesiser is always the final step
    graph.add_edge("synthesiser", END)

    return graph.compile()


# Singleton — compiled once at startup
research_graph = build_graph()


def run_research(query: str, model: str = None, max_sources: int = 5, enable_academic: bool = True) -> dict:
    from app.core.config import settings
    initial_state: ResearchState = {
        "query": query,
        "model": model or settings.primary_model,
        "max_sources": max_sources,
        "enable_academic": enable_academic,
        "sub_queries": [],
        "web_claims": [],
        "academic_claims": [],
        "factcheck_results": [],
        "report": "",
        "citations": [],
        "confidence_score": 0.0,
        "contradictions": [],
        "active_agents": [],
        "agents_complete": [],
        "trace": [],
    }

    final_state = research_graph.invoke(initial_state)
    return final_state
