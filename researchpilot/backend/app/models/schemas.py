from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


# ── Research ───────────────────────────────────────────────────────────────────

class ResearchRequest(BaseModel):
    query: str
    model: str = "llama-3.3-70b-versatile"
    max_sources: int = 5
    enable_academic: bool = True


class Citation(BaseModel):
    title: str
    url: str
    snippet: str
    confidence: float
    source_type: str   # web | academic | factcheck


class AgentTraceEvent(BaseModel):
    node: str
    status: str        # running | complete | error
    detail: str
    timestamp: str
    confidence: Optional[float] = None


class ResearchResponse(BaseModel):
    session_id: int
    query: str
    report: str
    citations: List[Citation]
    trace: List[AgentTraceEvent]
    confidence_score: float
    model_used: str
    created_at: str


# ── Eval ───────────────────────────────────────────────────────────────────────

class EvalRequest(BaseModel):
    query: str
    models: List[str]  # list of model identifiers to compare
    prompt_version_id: Optional[int] = None


class EvalScore(BaseModel):
    relevance: float
    faithfulness: float
    conciseness: float
    safety: float
    overall: float
    reasoning: str


class EvalResultOut(BaseModel):
    id: int
    query: str
    model_name: str
    response: str
    scores: EvalScore
    latency_ms: int
    created_at: str


class ABComparisonResponse(BaseModel):
    query: str
    results: List[EvalResultOut]
    winner: str
    winner_reasoning: str


# ── Prompt Registry ────────────────────────────────────────────────────────────

class PromptCreate(BaseModel):
    name: str
    content: str
    description: str = ""


class PromptOut(BaseModel):
    id: int
    name: str
    version: int
    content: str
    description: str
    avg_score: float
    run_count: int
    is_active: bool
    created_at: str


class PromptDiff(BaseModel):
    name: str
    version_a: int
    version_b: int
    content_a: str
    content_b: str
    score_a: float
    score_b: float


# ── Batch Eval ─────────────────────────────────────────────────────────────────

class TestCase(BaseModel):
    input: str
    expected_output: Optional[str] = None


class BatchEvalRequest(BaseModel):
    name: str
    model_name: str
    test_cases: List[TestCase]
    prompt_version_id: Optional[int] = None


class BatchEvalOut(BaseModel):
    id: int
    name: str
    model_name: str
    status: str
    avg_overall_score: float
    results: List[Dict[str, Any]]
    created_at: str


# ── Documents ──────────────────────────────────────────────────────────────────

class DocumentUploadResponse(BaseModel):
    doc_id: str
    filename: str
    chunks: int
    message: str


# ── Health ─────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    indexed_docs: int
    total_sessions: int
    total_evals: int
