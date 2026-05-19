import os
import shutil
import json
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response

from app.core.vector_store import vector_store
from app.core.config import settings

router = APIRouter()

ALLOWED = {".pdf", ".txt", ".md"}


# ── Documents ──────────────────────────────────────────────────────────────────

@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' not supported. Use: {ALLOWED}")

    os.makedirs(settings.upload_dir, exist_ok=True)
    path = os.path.join(settings.upload_dir, file.filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        result = vector_store.add_document(path, file.filename)
        return {"success": True, **result, "message": f"Indexed {result['chunks']} chunks"}
    except Exception as e:
        os.remove(path)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents")
def list_documents():
    docs = vector_store.list_documents()
    return {"documents": docs, "count": len(docs)}


@router.delete("/documents/{filename}")
def delete_document(filename: str):
    deleted = vector_store.delete_document(filename)
    path = os.path.join(settings.upload_dir, filename)
    if os.path.exists(path):
        os.remove(path)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"success": True, "message": f"'{filename}' deleted"}


# ── Export ─────────────────────────────────────────────────────────────────────

@router.get("/export/markdown/{session_id}")
def export_markdown(session_id: int):
    from app.core.database import engine
    from sqlmodel import Session
    from app.core.database import ResearchSession

    with Session(engine) as db:
        s = db.get(ResearchSession, session_id)
        if not s:
            raise HTTPException(status_code=404, detail="Session not found")

        citations = json.loads(s.citations)
        refs = "\n".join(
            f"{i+1}. [{c['title']}]({c['url']}) — confidence: {c['confidence']:.0%}"
            for i, c in enumerate(citations)
            if c.get("title")
        )

        md = f"""# Research Report

**Query:** {s.query}
**Model:** {s.model_used}
**Confidence:** {s.confidence_score:.0%}
**Date:** {s.created_at.strftime('%Y-%m-%d %H:%M UTC')}

---

{s.report}

---

## References

{refs if refs else '_No citations available_'}
"""
        return Response(
            content=md,
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="research_{session_id}.md"'},
        )


@router.get("/export/pdf/{session_id}")
def export_pdf(session_id: int):
    """Convert markdown report to PDF using weasyprint."""
    from app.core.database import engine
    from sqlmodel import Session
    from app.core.database import ResearchSession
    import markdown as md_lib

    with Session(engine) as db:
        s = db.get(ResearchSession, session_id)
        if not s:
            raise HTTPException(status_code=404, detail="Session not found")

        citations = json.loads(s.citations)
        refs_md = "\n".join(
            f"- [{c['title']}]({c['url']}) — {c['confidence']:.0%} confidence"
            for c in citations if c.get("title")
        )

        full_md = f"""# Research Report: {s.query}

**Model:** {s.model_used} | **Confidence:** {s.confidence_score:.0%} | **Date:** {s.created_at.strftime('%Y-%m-%d')}

---

{s.report}

## References

{refs_md or '_No citations_'}
"""
        html_body = md_lib.markdown(full_md, extensions=["tables", "fenced_code"])
        html = f"""<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>
  body {{ font-family: Georgia, serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; line-height: 1.7; }}
  h1 {{ color: #0f172a; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }}
  h2 {{ color: #1e293b; margin-top: 2em; }}
  code {{ background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }}
  blockquote {{ border-left: 4px solid #6366f1; margin: 0; padding-left: 1em; color: #475569; }}
  a {{ color: #6366f1; }}
</style>
</head><body>{html_body}</body></html>"""

        try:
            from weasyprint import HTML
            pdf_bytes = HTML(string=html).write_pdf()
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="research_{session_id}.pdf"'},
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


# ── Health ─────────────────────────────────────────────────────────────────────

@router.get("/health")
def health():
    from app.core.database import engine
    from sqlmodel import Session, select, func
    from app.core.database import ResearchSession, EvalResult

    with Session(engine) as db:
        sessions = db.exec(select(func.count(ResearchSession.id))).one()
        evals = db.exec(select(func.count(EvalResult.id))).one()

    docs = vector_store.list_documents()
    return {
        "status": "healthy",
        "indexed_docs": len(docs),
        "total_sessions": sessions,
        "total_evals": evals,
    }
