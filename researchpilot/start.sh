#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       ResearchPilot — Local Setup        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Check .env ────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✗  .env created from .env.example"
  echo "   Set GROQ_API_KEY and TAVILY_API_KEY then re-run."
  exit 1
fi

source .env

if [ -z "$GROQ_API_KEY" ] || [ "$GROQ_API_KEY" = "your_groq_api_key_here" ]; then
  echo "✗  GROQ_API_KEY not set in .env"
  echo "   Get your free key at: https://console.groq.com"
  exit 1
fi

if [ -z "$TAVILY_API_KEY" ] || [ "$TAVILY_API_KEY" = "your_tavily_api_key_here" ]; then
  echo "✗  TAVILY_API_KEY not set in .env"
  echo "   Get your free key at: https://tavily.com (1000 searches/month free)"
  exit 1
fi

echo "✓  API keys loaded"

# ── Backend ───────────────────────────────────────────────────────────────────
echo ""
echo "── Setting up backend ──"
cd backend

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  echo "✓  Virtual environment created"
fi

source .venv/bin/activate
pip install -q -r requirements.txt
echo "✓  Python dependencies installed"

# Copy .env for backend
cp ../.env .env 2>/dev/null || true

mkdir -p data/chroma data/uploads data/sessions

uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "✓  Backend running on http://localhost:8000 (PID $BACKEND_PID)"
cd ..

# ── Frontend ──────────────────────────────────────────────────────────────────
echo ""
echo "── Setting up frontend ──"
cd frontend

npm install --silent
echo "✓  Node dependencies installed"

npm run dev &
FRONTEND_PID=$!
echo "✓  Frontend running on http://localhost:5173 (PID $FRONTEND_PID)"
cd ..

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ResearchPilot is running!                   ║"
echo "║                                              ║"
echo "║  Frontend:  http://localhost:5173            ║"
echo "║  Backend:   http://localhost:8000            ║"
echo "║  API docs:  http://localhost:8000/docs       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'; exit" INT TERM
wait
