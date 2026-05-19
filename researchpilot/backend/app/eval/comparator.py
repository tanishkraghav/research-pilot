import os
"""
Multi-model comparator (PromptOps layer) — runs the same research query
against 2-3 LLMs simultaneously, scores each with the critic, and
picks a winner with reasoning.
"""
import time
import json
from datetime import datetime, timezone
from typing import List

import httpx
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate

from app.core.config import settings
os.environ.setdefault("GROQ_API_KEY", settings.groq_api_key)
from app.eval.critic import score_response


SIMPLE_RESEARCH_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are a knowledgeable research assistant. Answer the question comprehensively but concisely, in 200-300 words."),
    ("human", "{query}"),
])

COMPARATOR_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert evaluator. Given multiple AI responses to the same query,
pick the best one and explain why in 2-3 sentences.

Return ONLY a JSON object:
{{
  "winner": "<model name>",
  "reasoning": "<2-3 sentence explanation>"
}}"""),
    ("human", """Query: {query}

Responses:
{responses_text}

JSON winner selection:"""),
])

judge_llm = ChatGroq(
    model=settings.fast_model,
    temperature=0.0,
)


def _call_groq(model: str, query: str) -> tuple[str, int]:
    """Returns (response_text, latency_ms)."""
    llm = ChatGroq(
        model=model,
        temperature=0.3,
    )
    chain = SIMPLE_RESEARCH_PROMPT | llm
    start = time.time()
    result = chain.invoke({"query": query})
    latency = int((time.time() - start) * 1000)
    return result.content.strip(), latency


def _call_openrouter(model: str, query: str) -> tuple[str, int]:
    """Calls OpenRouter free-tier models."""
    if not settings.openrouter_api_key:
        return f"[OpenRouter key not set — skipping {model}]", 0

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://researchpilot.app",
        "X-Title": "ResearchPilot",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a knowledgeable research assistant. Answer comprehensively but concisely in 200-300 words."},
            {"role": "user", "content": query},
        ],
        "max_tokens": 600,
    }
    start = time.time()
    try:
        response = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60.0,
        )
        data = response.json()
        latency = int((time.time() - start) * 1000)
        text = data["choices"][0]["message"]["content"]
        return text.strip(), latency
    except Exception as e:
        latency = int((time.time() - start) * 1000)
        return f"[Error calling {model}: {str(e)}]", latency


def _is_groq_model(model: str) -> bool:
    groq_models = {
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "llama-3.3-70b-versatile",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
    }
    return model in groq_models


def run_ab_comparison(query: str, models: List[str]) -> dict:
    """
    Run the query against each model, score with critic, pick winner.
    Returns structured comparison result.
    """
    results = []

    for model in models[:3]:  # cap at 3 to respect free tiers
        try:
            if _is_groq_model(model):
                response_text, latency = _call_groq(model, query)
            else:
                response_text, latency = _call_openrouter(model, query)

            scores = score_response(query, response_text)
            results.append({
                "model_name": model,
                "response": response_text,
                "scores": scores,
                "latency_ms": latency,
            })
        except Exception as e:
            results.append({
                "model_name": model,
                "response": f"[Error: {str(e)}]",
                "scores": {"relevance": 0, "faithfulness": 0, "conciseness": 0, "safety": 0, "overall": 0, "reasoning": ""},
                "latency_ms": 0,
            })

    # Pick winner
    best = max(results, key=lambda r: r["scores"]["overall"]) if results else None

    try:
        responses_text = "\n\n---\n\n".join(
            f"Model: {r['model_name']}\nScore: {r['scores']['overall']:.2f}\n{r['response'][:300]}..."
            for r in results
        )
        chain = COMPARATOR_PROMPT | judge_llm
        comp_result = chain.invoke({"query": query, "responses_text": responses_text})
        raw = comp_result.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        winner_data = json.loads(raw.strip())
        winner = winner_data.get("winner", best["model_name"] if best else "")
        winner_reasoning = winner_data.get("reasoning", "")
    except Exception:
        winner = best["model_name"] if best else ""
        winner_reasoning = f"Selected by highest overall score: {best['scores']['overall']:.2f}" if best else ""

    return {
        "query": query,
        "results": results,
        "winner": winner,
        "winner_reasoning": winner_reasoning,
    }
