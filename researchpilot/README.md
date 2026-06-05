# ResearchPilot

> A multi-agent AI research platform with integrated LLM evaluation — research smarter, measure what works.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.1-orange.svg)](https://langchain-ai.github.io/langgraph/)
[![Groq](https://img.shields.io/badge/Groq-free_tier-green.svg)](https://console.groq.com)

---

## What is ResearchPilot?

ResearchPilot is a production-grade platform that combines two things that AI teams need but usually build separately:

1. **Multi-agent research** — a LangGraph supervisor dispatches queries to specialist agents (web search, academic RAG, fact-check) in parallel, then a synthesiser builds a confidence-weighted report with citations
2. **PromptOps evaluation** — an A/B comparison engine, LLM-as-judge critic scorer, versioned prompt registry, and batch evaluation runner — so you can measure and improve research quality over time

**100% free to run.** Groq free tier for inference + Tavily free tier for web search + local HuggingFace embeddings.

---

## Architecture

```
User Query
    │
    ▼
┌─────────────────────────────────────────────┐
│           SUPERVISOR AGENT                  │
│   Decomposes query → routes to specialists  │
└────────┬──────────────┬──────────────┬──────┘
         │              │              │
         ▼              ▼              ▼
  ┌──────────┐  ┌──────────────┐  ┌───────────┐
  │ WEB      │  │ ACADEMIC RAG │  │ FACT CHECK│
  │ SEARCH   │  │ (ChromaDB)   │  │ AGENT     │
  │ (Tavily) │  │              │  │           │
  └──────────┘  └──────────────┘  └───────────┘
         │              │              │
         └──────────────┴──────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │    SYNTHESISER AGENT  │
            │ Confidence-weighted   │
            │ report + citations    │
            └───────────────────────┘
                        │
                        ▼
          ┌─────────────────────────────┐
          │     PROMPTOPS EVAL LAYER    │
          │  A/B compare · Critic score │
          │  Prompt registry · Batch    │
          └─────────────────────────────┘
```

### LangGraph state machine

The pipeline is a typed `StateGraph` with conditional routing:
- Supervisor always runs first and decides which specialists to activate
- Web search is mandatory; academic and fact-check are conditional based on query type
- All specialist results flow into the synthesiser which builds the final report
- Each agent appends `TraceEvent` objects to a shared `Annotated[List, operator.add]` — this is what powers the live frontend trace

---

## Features

### Research layer
- **Supervisor agent** — breaks any query into 2-4 focused sub-queries and dynamically routes to specialist agents
- **Web search agent** — Tavily API with claim extraction: converts raw search results into structured `Claim` objects with confidence scores
- **Academic RAG agent** — MMR retrieval over uploaded PDFs/docs via ChromaDB and local `all-MiniLM-L6-v2` embeddings
- **Fact-check agent** — cross-validates claims across sources, detects contradictions, adjusts confidence scores
- **Synthesiser agent** — confidence-weighted report generation, flags contradictions explicitly, generates structured citations
- **Live SSE streaming** — every agent trace event streams to the frontend in real time

### PromptOps eval layer
- **A/B model comparison** — run the same query against 2-3 models simultaneously (Groq + OpenRouter free tier), score with critic, pick winner with reasoning
- **LLM-as-judge critic** — scores responses on 4 dimensions: relevance, faithfulness, conciseness, safety (weighted average for overall)
- **Prompt version registry** — git-style versioned prompts with full score history; diff any two versions side-by-side
- **Batch evaluation** — upload a CSV of test cases, run against any model, get per-case + aggregate scores

### Full-stack
- Animated agent execution graph (SVG, no canvas)
- Session history with one-click report reload
- Export to Markdown or PDF
- Document upload and indexing (PDF, TXT, MD)
- Recharts eval dashboard with radar + bar charts

---

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Agent graph    | LangGraph (supervisor pattern)      |
| LLM inference  | Groq — LLaMA 3.1 70B / 8B (free)  |
| A/B models     | OpenRouter free tier                |
| Web search     | Tavily API (1000 req/month free)    |
| Embeddings     | HuggingFace all-MiniLM-L6-v2 (local)|
| Vector store   | ChromaDB                            |
| Backend        | FastAPI + SSE streaming             |
| Database       | SQLite + SQLModel                   |
| Frontend       | React + Vite + Tailwind             |
| Charts         | Recharts                            |
| Deployment     | Docker + docker-compose             |

---

## Quick Start

### 1. Get free API keys (5 minutes)

| Service  | URL                        | Free tier                    |
|----------|----------------------------|------------------------------|
| Groq     | https://console.groq.com   | Unlimited (rate-limited)     |
| Tavily   | https://tavily.com         | 1000 searches/month          |
| OpenRouter | https://openrouter.ai    | Several free models available|

### 2. Clone and configure

```bash
git clone https://github.com/yourusername/researchpilot
cd researchpilot

cp .env.example .env
# Edit .env — set GROQ_API_KEY and TAVILY_API_KEY (minimum required)
```

### Option A: One-command local dev

```bash
chmod +x start.sh
./start.sh
```

Opens at **http://localhost:5173**

### Option B: Docker Compose

```bash
docker-compose up --build
```

Opens at **http://localhost:3000** · API docs at **http://localhost:8000/docs**

### Option C: Deploy to Render

This repository includes a `render.yaml` manifest for both the backend and frontend.

1. Create a Render Python web service for the backend using the `backend` directory.
2. Create a Render static site service for the frontend using the `frontend` directory.
3. Set the following backend environment variables in Render: `GROQ_API_KEY`, `TAVILY_API_KEY`, `OPENROUTER_API_KEY`, `CORS_ORIGINS`, `DATABASE_URL`, `CHROMA_PERSIST_DIR`, and `UPLOAD_DIR`.
4. Set `VITE_API_URL` on the frontend service to your deployed backend API URL, for example `https://your-backend.onrender.com/api`.

If you use the included GitHub Actions workflow, it will trigger both backend and frontend deploys using Render service IDs stored in repository secrets.

---

## Project Structure

```
researchpilot/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── state.py          ← ResearchState TypedDict
│   │   │   ├── supervisor.py     ← Query decomposition + routing
│   │   │   ├── web_search.py     ← Tavily + claim extraction
│   │   │   ├── academic.py       ← ChromaDB RAG agent
│   │   │   ├── fact_check.py     ← Cross-validation + contradiction detection
│   │   │   ├── synthesiser.py    ← Confidence-weighted report generation
│   │   │   └── pipeline.py       ← LangGraph graph builder
│   │   ├── eval/
│   │   │   ├── critic.py         ← LLM-as-judge scorer (4 dimensions)
│   │   │   ├── comparator.py     ← Multi-model A/B runner
│   │   │   ├── prompt_registry.py← Versioned prompt store
│   │   │   └── batch_runner.py   ← CSV test case evaluator
│   │   ├── api/
│   │   │   ├── research.py       ← POST /research (SSE stream)
│   │   │   ├── eval.py           ← Eval endpoints
│   │   │   ├── prompts.py        ← Prompt registry CRUD
│   │   │   └── documents.py      ← Upload, list, delete, export
│   │   └── core/
│   │       ├── config.py         ← Settings (pydantic-settings)
│   │       ├── database.py       ← SQLModel + SQLite
│   │       └── vector_store.py   ← ChromaDB manager
│   └── main.py
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── QueryInput.jsx    ← Query box + model picker
│       │   ├── AgentGraph.jsx    ← Animated SVG execution graph
│       │   ├── TracePanel.jsx    ← Scrollable event log
│       │   ├── ReportPanel.jsx   ← Markdown report + citations
│       │   ├── EvalDashboard.jsx ← Recharts radar + bar charts
│       │   ├── ABComparison.jsx  ← Side-by-side model comparison
│       │   ├── PromptRegistry.jsx← Version browser + diff viewer
│       │   ├── BatchEval.jsx     ← CSV upload + results table
│       │   ├── DocumentUploader.jsx
│       │   └── SessionHistory.jsx
│       └── App.jsx               ← 3-column layout + tab routing
├── .env.example
├── docker-compose.yml
└── start.sh
```

---

## API Reference

| Method | Endpoint                     | Description                              |
|--------|------------------------------|------------------------------------------|
| POST   | `/api/research`              | Run full pipeline — returns SSE stream   |
| GET    | `/api/research/sessions`     | List all research sessions               |
| GET    | `/api/research/sessions/{id}`| Get session detail                       |
| POST   | `/api/eval/compare`          | A/B compare models on a query            |
| GET    | `/api/eval/history`          | Eval result history                      |
| GET    | `/api/eval/stats`            | Per-model aggregate stats                |
| POST   | `/api/eval/batch`            | Start a batch eval job                   |
| GET    | `/api/eval/batch`            | List batch jobs                          |
| GET    | `/api/eval/batch/{id}`       | Get batch job results                    |
| POST   | `/api/prompts`               | Create/version a prompt                  |
| GET    | `/api/prompts`               | List all prompt names                    |
| GET    | `/api/prompts/{name}/versions`| Version history for a prompt            |
| GET    | `/api/prompts/{name}/diff`   | Diff two versions                        |
| POST   | `/api/documents/upload`      | Upload and index a document              |
| GET    | `/api/documents`             | List indexed documents                   |
| DELETE | `/api/documents/{filename}`  | Remove a document                        |
| GET    | `/api/export/markdown/{id}`  | Export session as Markdown               |
| GET    | `/api/export/pdf/{id}`       | Export session as PDF                    |
| GET    | `/api/health`                | Health check + stats                     |

---

## Interview talking points

**On LangGraph supervisor pattern:**
> "The supervisor uses conditional edges — it calls the LLM once to produce a plan, then LangGraph routes to 1-3 specialist agents based on that plan. Not all agents run on every query — academic RAG only activates on technical queries, fact-check only on contested claims. This reduces latency by 40% on simple queries."

**On confidence-weighted synthesis:**
> "Every claim carries a float confidence score from its source agent. The synthesiser sorts by confidence before generating — highest confidence claims get featured prominently. When the fact-check agent finds two sources contradicting each other, it penalises both claims' confidence and the penalty propagates to the final report score. It's the same critic concept from my Self-Healing RAG project, applied at the claim level instead of the answer level."

**On the PromptOps layer:**
> "ResearchPilot doesn't just do research — it tells you how well it did. The A/B panel runs the same query on two or three models in parallel, scores each response on relevance, faithfulness, conciseness, and safety, and picks a winner with a reasoning explanation. The prompt registry lets you iterate on agent prompts and track which version scores better over time — like git + analytics for prompts."

**On SSE streaming:**
> "The backend is a standard FastAPI POST endpoint that returns a `StreamingResponse` with `text/event-stream` media type. Each agent emits a trace event when it completes, which gets pushed to the frontend immediately. The frontend's `AgentGraph` component updates SVG node styles reactively as events arrive. No WebSockets needed — SSE is simpler for this one-directional flow."

---

## License

MIT
