"""
Prompt registry (PromptOps layer) — git-style versioned prompt management.
Every time a prompt is updated a new version is created, never overwritten.
Scores are tracked per version so you can see which version performs best.
"""
from datetime import datetime, timezone
from typing import List, Optional

from sqlmodel import Session, select

from app.core.database import engine, PromptVersion


def create_prompt(name: str, content: str, description: str = "") -> PromptVersion:
    """Create a new prompt or add a new version if name already exists."""
    with Session(engine) as session:
        # Find highest existing version for this name
        existing = session.exec(
            select(PromptVersion)
            .where(PromptVersion.name == name)
            .order_by(PromptVersion.version.desc())
        ).first()

        new_version = (existing.version + 1) if existing else 1

        # Deactivate previous versions
        if existing:
            all_versions = session.exec(
                select(PromptVersion).where(PromptVersion.name == name)
            ).all()
            for v in all_versions:
                v.is_active = False
            session.add_all(all_versions)

        prompt = PromptVersion(
            name=name,
            version=new_version,
            content=content,
            description=description,
            is_active=True,
        )
        session.add(prompt)
        session.commit()
        session.refresh(prompt)
        return prompt


def get_active_prompt(name: str) -> Optional[PromptVersion]:
    with Session(engine) as session:
        return session.exec(
            select(PromptVersion)
            .where(PromptVersion.name == name, PromptVersion.is_active == True)
        ).first()


def get_all_versions(name: str) -> List[PromptVersion]:
    with Session(engine) as session:
        return list(session.exec(
            select(PromptVersion)
            .where(PromptVersion.name == name)
            .order_by(PromptVersion.version.desc())
        ).all())


def get_prompt_by_id(prompt_id: int) -> Optional[PromptVersion]:
    with Session(engine) as session:
        return session.get(PromptVersion, prompt_id)


def list_prompt_names() -> List[str]:
    with Session(engine) as session:
        rows = session.exec(select(PromptVersion.name).distinct()).all()
        return list(rows)


def update_prompt_score(prompt_id: int, new_score: float):
    """Rolling average update when a new eval result comes in."""
    with Session(engine) as session:
        prompt = session.get(PromptVersion, prompt_id)
        if prompt:
            total = prompt.avg_score * prompt.run_count + new_score
            prompt.run_count += 1
            prompt.avg_score = round(total / prompt.run_count, 3)
            session.add(prompt)
            session.commit()


def diff_versions(name: str, version_a: int, version_b: int) -> dict:
    with Session(engine) as session:
        va = session.exec(
            select(PromptVersion)
            .where(PromptVersion.name == name, PromptVersion.version == version_a)
        ).first()
        vb = session.exec(
            select(PromptVersion)
            .where(PromptVersion.name == name, PromptVersion.version == version_b)
        ).first()

        if not va or not vb:
            return {}

        return {
            "name": name,
            "version_a": version_a,
            "version_b": version_b,
            "content_a": va.content,
            "content_b": vb.content,
            "score_a": va.avg_score,
            "score_b": vb.avg_score,
        }
