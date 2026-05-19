from fastapi import APIRouter, HTTPException
from app.models.schemas import PromptCreate, PromptOut, PromptDiff
from app.eval.prompt_registry import (
    create_prompt, get_active_prompt, get_all_versions,
    get_prompt_by_id, list_prompt_names, diff_versions
)

router = APIRouter()


@router.post("/prompts", response_model=dict)
def create_new_prompt(body: PromptCreate):
    prompt = create_prompt(body.name, body.content, body.description)
    return {
        "id": prompt.id,
        "name": prompt.name,
        "version": prompt.version,
        "message": f"Created version {prompt.version} of '{prompt.name}'",
    }


@router.get("/prompts")
def list_prompts():
    names = list_prompt_names()
    result = []
    for name in names:
        active = get_active_prompt(name)
        if active:
            result.append({
                "name": name,
                "active_version": active.version,
                "active_id": active.id,
                "avg_score": active.avg_score,
                "run_count": active.run_count,
                "description": active.description,
                "created_at": active.created_at.isoformat(),
            })
    return result


@router.get("/prompts/{name}/versions")
def get_versions(name: str):
    versions = get_all_versions(name)
    if not versions:
        raise HTTPException(status_code=404, detail=f"No prompt named '{name}'")
    return [
        {
            "id": v.id,
            "version": v.version,
            "content": v.content,
            "description": v.description,
            "avg_score": v.avg_score,
            "run_count": v.run_count,
            "is_active": v.is_active,
            "created_at": v.created_at.isoformat(),
        }
        for v in versions
    ]


@router.get("/prompts/{name}/diff")
def get_diff(name: str, v1: int, v2: int):
    result = diff_versions(name, v1, v2)
    if not result:
        raise HTTPException(status_code=404, detail="Versions not found")
    return result


@router.get("/prompts/id/{prompt_id}")
def get_by_id(prompt_id: int):
    p = get_prompt_by_id(prompt_id)
    if not p:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {
        "id": p.id,
        "name": p.name,
        "version": p.version,
        "content": p.content,
        "description": p.description,
        "avg_score": p.avg_score,
        "run_count": p.run_count,
        "is_active": p.is_active,
        "created_at": p.created_at.isoformat(),
    }
