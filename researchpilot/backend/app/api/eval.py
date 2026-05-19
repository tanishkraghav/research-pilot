import json
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import Session, select

from app.models.schemas import EvalRequest, ABComparisonResponse, BatchEvalRequest, BatchEvalOut
from app.eval.comparator import run_ab_comparison
from app.eval.batch_runner import run_batch_eval, get_batch_job, list_batch_jobs
from app.eval.critic import score_response
from app.core.database import get_session, EvalResult, engine
from sqlmodel import Session as DBSession

router = APIRouter()


@router.post("/eval/compare")
def compare_models(request: EvalRequest):
    """
    Run the same query against multiple models and return scored comparison.
    Uses OpenRouter free-tier models + Groq for variety.
    """
    if not request.models:
        raise HTTPException(status_code=400, detail="Provide at least one model")

    result = run_ab_comparison(request.query, request.models)

    # Persist each result
    with DBSession(engine) as db:
        for r in result["results"]:
            scores = r["scores"]
            eval_row = EvalResult(
                query=request.query,
                model_name=r["model_name"],
                response=r["response"][:2000],
                relevance_score=scores["relevance"],
                faithfulness_score=scores["faithfulness"],
                conciseness_score=scores["conciseness"],
                safety_score=scores["safety"],
                overall_score=scores["overall"],
                critic_reasoning=scores["reasoning"][:1000],
                latency_ms=r["latency_ms"],
            )
            db.add(eval_row)
        db.commit()

    return result


@router.post("/eval/score")
def score_single(query: str, response: str):
    """Score a single response — useful for manual eval."""
    scores = score_response(query, response)
    return scores


@router.get("/eval/history")
def eval_history(limit: int = 50, db: Session = Depends(get_session)):
    rows = db.exec(
        select(EvalResult)
        .order_by(EvalResult.created_at.desc())
        .limit(limit)
    ).all()
    return [
        {
            "id": r.id,
            "query": r.query[:100],
            "model_name": r.model_name,
            "overall_score": r.overall_score,
            "relevance_score": r.relevance_score,
            "faithfulness_score": r.faithfulness_score,
            "conciseness_score": r.conciseness_score,
            "safety_score": r.safety_score,
            "latency_ms": r.latency_ms,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.get("/eval/stats")
def eval_stats(db: Session = Depends(get_session)):
    """Aggregate stats per model — powers the dashboard charts."""
    rows = db.exec(select(EvalResult)).all()
    if not rows:
        return {"models": [], "summary": {}}

    from collections import defaultdict
    by_model = defaultdict(list)
    for r in rows:
        by_model[r.model_name].append(r)

    model_stats = []
    for model, evals in by_model.items():
        n = len(evals)
        model_stats.append({
            "model": model,
            "count": n,
            "avg_overall": round(sum(e.overall_score for e in evals) / n, 3),
            "avg_relevance": round(sum(e.relevance_score for e in evals) / n, 3),
            "avg_faithfulness": round(sum(e.faithfulness_score for e in evals) / n, 3),
            "avg_conciseness": round(sum(e.conciseness_score for e in evals) / n, 3),
            "avg_latency_ms": round(sum(e.latency_ms for e in evals) / n),
        })

    return {"models": model_stats}


@router.post("/eval/batch")
def start_batch_eval(request: BatchEvalRequest, background_tasks: BackgroundTasks):
    """Start a batch eval job (runs in background)."""
    background_tasks.add_task(
        run_batch_eval,
        name=request.name,
        model_name=request.model_name,
        test_cases=request.test_cases,
        prompt_version_id=request.prompt_version_id,
    )
    return {"message": "Batch eval started", "name": request.name}


@router.get("/eval/batch")
def list_batch_evals():
    jobs = list_batch_jobs()
    return [
        {
            "id": j.id,
            "name": j.name,
            "model_name": j.model_name,
            "status": j.status,
            "avg_overall_score": j.avg_overall_score,
            "test_case_count": len(json.loads(j.test_cases)),
            "created_at": j.created_at.isoformat(),
        }
        for j in jobs
    ]


@router.get("/eval/batch/{job_id}")
def get_batch_result(job_id: int):
    job = get_batch_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": job.id,
        "name": job.name,
        "model_name": job.model_name,
        "status": job.status,
        "avg_overall_score": job.avg_overall_score,
        "results": json.loads(job.results),
        "created_at": job.created_at.isoformat(),
    }
