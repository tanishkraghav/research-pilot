from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, create_engine, Session, select
import json
import os

from app.core.config import settings


# ── Database Models ────────────────────────────────────────────────────────────

class ResearchSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    query: str
    report: str = ""
    citations: str = "[]"          # JSON list
    agent_trace: str = "[]"        # JSON list of trace events
    confidence_score: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    model_used: str = ""
    status: str = "pending"        # pending | running | complete | error


class EvalResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: Optional[int] = Field(default=None, foreign_key="researchsession.id")
    query: str
    model_name: str
    response: str
    relevance_score: float = 0.0
    faithfulness_score: float = 0.0
    conciseness_score: float = 0.0
    safety_score: float = 0.0
    overall_score: float = 0.0
    critic_reasoning: str = ""
    latency_ms: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PromptVersion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str                       # e.g. "web_search_agent"
    version: int = 1
    content: str                    # the prompt text
    description: str = ""
    avg_score: float = 0.0
    run_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True


class BatchEvalJob(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    prompt_version_id: Optional[int] = Field(default=None, foreign_key="promptversion.id")
    model_name: str
    test_cases: str = "[]"          # JSON list of {input, expected_output}
    results: str = "[]"             # JSON list of EvalResult-like dicts
    avg_overall_score: float = 0.0
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Engine + Helpers ───────────────────────────────────────────────────────────

os.makedirs("./data", exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
