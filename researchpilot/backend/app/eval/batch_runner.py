"""
Batch evaluation runner (PromptOps layer).
Accepts a list of test cases, runs each through a single model,
scores with the critic, and returns aggregate statistics.
"""
import json
import time
from typing import List, Optional
from datetime import datetime, timezone

from sqlmodel import Session

from app.core.database import engine, BatchEvalJob, EvalResult
from app.eval.critic import score_response
from app.eval.comparator import _call_groq, _call_openrouter, _is_groq_model
from app.models.schemas import TestCase


def run_batch_eval(
    name: str,
    model_name: str,
    test_cases: List[TestCase],
    prompt_version_id: Optional[int] = None,
) -> BatchEvalJob:
    """
    Runs all test cases synchronously (for background task usage).
    Persists results in BatchEvalJob.
    """
    with Session(engine) as session:
        job = BatchEvalJob(
            name=name,
            model_name=model_name,
            test_cases=json.dumps([tc.dict() for tc in test_cases]),
            prompt_version_id=prompt_version_id,
            status="running",
        )
        session.add(job)
        session.commit()
        session.refresh(job)
        job_id = job.id

    results = []
    total_score = 0.0

    for i, tc in enumerate(test_cases):
        try:
            if _is_groq_model(model_name):
                response_text, latency = _call_groq(model_name, tc.input)
            else:
                response_text, latency = _call_openrouter(model_name, tc.input)

            scores = score_response(tc.input, response_text)

            result_row = {
                "test_case_index": i,
                "input": tc.input,
                "expected_output": tc.expected_output,
                "response": response_text,
                "scores": scores,
                "latency_ms": latency,
            }
            results.append(result_row)
            total_score += scores["overall"]

        except Exception as e:
            results.append({
                "test_case_index": i,
                "input": tc.input,
                "expected_output": tc.expected_output,
                "response": f"[Error: {str(e)}]",
                "scores": {"relevance": 0, "faithfulness": 0, "conciseness": 0, "safety": 0, "overall": 0, "reasoning": ""},
                "latency_ms": 0,
            })

    avg_score = total_score / len(test_cases) if test_cases else 0.0

    with Session(engine) as session:
        job = session.get(BatchEvalJob, job_id)
        if job:
            job.results = json.dumps(results)
            job.avg_overall_score = round(avg_score, 3)
            job.status = "complete"
            session.add(job)
            session.commit()
            session.refresh(job)
            return job

    return None


def get_batch_job(job_id: int) -> Optional[BatchEvalJob]:
    with Session(engine) as session:
        return session.get(BatchEvalJob, job_id)


def list_batch_jobs() -> List[BatchEvalJob]:
    from sqlmodel import select
    with Session(engine) as session:
        return list(session.exec(
            select(BatchEvalJob).order_by(BatchEvalJob.created_at.desc()).limit(50)
        ).all())
