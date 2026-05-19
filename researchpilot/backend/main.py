from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# Set API keys in env BEFORE any LangChain modules load
from app.core.config import settings
os.environ["GROQ_API_KEY"]   = settings.groq_api_key
os.environ["TAVILY_API_KEY"] = settings.tavily_api_key
if settings.openrouter_api_key:
    os.environ["OPENROUTER_API_KEY"] = settings.openrouter_api_key

from app.core.database import create_db_and_tables
from app.api.research import router as research_router
from app.api.eval import router as eval_router
from app.api.prompts import router as prompts_router
from app.api.documents import router as documents_router

app = FastAPI(
    title="ResearchPilot API",
    description="Multi-agent AI research platform with integrated LLM evaluation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(research_router, prefix="/api")
app.include_router(eval_router, prefix="/api")
app.include_router(prompts_router, prefix="/api")
app.include_router(documents_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    os.makedirs("./data/chroma", exist_ok=True)
    os.makedirs("./data/uploads", exist_ok=True)
    os.makedirs("./data/sessions", exist_ok=True)
    create_db_and_tables()


if os.path.isdir("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")