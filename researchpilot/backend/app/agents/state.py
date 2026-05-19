from __future__ import annotations
from typing import TypedDict, List, Annotated, Optional
from langchain.schema import Document
import operator


class Claim(TypedDict):
    text: str
    confidence: float
    source_url: str
    source_title: str
    source_type: str   # web | academic | factcheck
    agent: str


class TraceEvent(TypedDict):
    node: str
    status: str
    detail: str
    timestamp: str
    confidence: Optional[float]


class ResearchState(TypedDict):
    # Input
    query: str
    model: str
    max_sources: int
    enable_academic: bool

    # Supervisor plan
    sub_queries: List[str]

    # Agent outputs — accumulated across retries
    web_claims: List[Claim]
    academic_claims: List[Claim]
    factcheck_results: List[dict]

    # Synthesised output
    report: str
    citations: List[dict]
    confidence_score: float
    contradictions: List[str]

    # Control
    active_agents: List[str]
    agents_complete: List[str]

    # Trace — append-only
    trace: Annotated[List[TraceEvent], operator.add]
