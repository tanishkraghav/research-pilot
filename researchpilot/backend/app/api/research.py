"""
Research API — POST /api/research streams the pipeline via SSE.
"""
import json
import asyncio
import traceback
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.models.schemas import ResearchRequest
from app.core.database import get_session, ResearchSession, engine
from sqlmodel import Session as DBSession

router = APIRouter()


async def _stream_research(request: ResearchRequest) -> AsyncGenerator[str, None]:
    loop = asyncio.get_event_loop()

    def _emit(type_: str, data: dict) -> str:
        return f"data: {json.dumps({'type': type_, 'data': data})}\n\n"

    yield _emit("trace", {
        "node": "pipeline", "status": "running",
        "detail": f"Pipeline started for: \"{request.query[:80]}\"",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "confidence": None,
    })

    final_state = None
    error_msg   = None

    try:
        from app.agents.pipeline import run_research
        final_state = await loop.run_in_executor(
            None,
            lambda: run_research(
                query=request.query,
                model=request.model,
                max_sources=request.max_sources,
                enable_academic=request.enable_academic,
            )
        )
    except Exception:
        error_msg = traceback.format_exc()

    if error_msg:
        yield _emit("trace", {
            "node": "pipeline", "status": "error",
            "detail": f"Error:\n{error_msg[-800:]}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "confidence": None,
        })
        yield _emit("error", {"message": error_msg[-300:]})
        yield "data: [DONE]\n\n"
        return

    for event in final_state.get("trace", []):
        yield _emit("trace", event)
        await asyncio.sleep(0.1)

    db_session_id = -1
    try:
        with DBSession(engine) as db:
            row = ResearchSession(
                query=request.query,
                report=final_state.get("report", ""),
                citations=json.dumps(final_state.get("citations", [])),
                agent_trace=json.dumps(final_state.get("trace", [])),
                confidence_score=final_state.get("confidence_score", 0.0),
                model_used=request.model,
                status="complete",
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            db_session_id = row.id
    except Exception:
        pass

    yield _emit("result", {
        "session_id":       db_session_id,
        "query":            request.query,
        "report":           final_state.get("report", ""),
        "citations":        final_state.get("citations", []),
        "confidence_score": final_state.get("confidence_score", 0.0),
        "model_used":       request.model,
        "contradictions":   final_state.get("contradictions", []),
    })
    yield "data: [DONE]\n\n"


@router.post("/research")
async def research(request: ResearchRequest):
    return StreamingResponse(
        _stream_research(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":        "keep-alive",
        },
    )


@router.get("/research/sessions")
def list_sessions(session: Session = Depends(get_session)):
    rows = session.exec(
        select(ResearchSession)
        .order_by(ResearchSession.created_at.desc())
        .limit(50)
    ).all()
    return [
        {
            "id":               s.id,
            "query":            s.query,
            "confidence_score": s.confidence_score,
            "model_used":       s.model_used,
            "created_at":       s.created_at.isoformat(),
            "status":           s.status,
        }
        for s in rows
    ]


@router.get("/research/sessions/{session_id}")
def get_session_detail(session_id: int, db: Session = Depends(get_session)):
    s = db.get(ResearchSession, session_id)
    if not s:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id":               s.id,
        "query":            s.query,
        "report":           s.report,
        "citations":        json.loads(s.citations),
        "trace":            json.loads(s.agent_trace),
        "confidence_score": s.confidence_score,
        "model_used":       s.model_used,
        "created_at":       s.created_at.isoformat(),
    }