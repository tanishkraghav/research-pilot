from dotenv import dotenv_values
from pydantic import BaseModel, Field, field_validator
from typing import List
import os


env = dotenv_values(".env")
env = {k: v for k, v in env.items() if v is not None}
env.update({k: v for k, v in os.environ.items()})


class Settings(BaseModel):
    # LLM Providers
    groq_api_key: str
    openrouter_api_key: str = ""
    tavily_api_key: str

    # Models (all free)
    primary_model: str = "llama-3.3-70b-versatile"
    fast_model: str = "llama-3.1-8b-instant"
    critic_model: str = "llama-3.3-70b-versatile"

    # A/B comparison models via OpenRouter
    ab_model_1: str = "meta-llama/llama-3.1-8b-instruct:free"
    ab_model_2: str = "google/gemma-2-9b-it:free"
    ab_model_3: str = "mistralai/mistral-7b-instruct:free"

    # Embeddings
    embedding_model: str = "BAAI/bge-small-en-v1.5"

    # Storage
    chroma_persist_dir: str = "./data/chroma"
    upload_dir: str = "./data/uploads"
    database_url: str = "sqlite:///./data/researchpilot.db"

    # Pipeline
    max_search_results: int = 5
    max_agents: int = 4
    confidence_threshold: float = 0.6
    critic_threshold: float = 0.65

    # CORS
    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:5173", "http://localhost:3000"])

    @field_validator("cors_origins", mode="before")
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings(**{k.lower(): v for k, v in env.items() if v is not None})
