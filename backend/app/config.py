from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
from typing import Literal


class Settings(BaseSettings):
    # ── LLM Provider ──────────────────────────────────────────
    LLM_PROVIDER: Literal["groq", "ollama"] = "groq"

    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Ollama (local)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:7b "

    # ── Embedding Provider ────────────────────────────────────
    EMBEDDING_PROVIDER: Literal["local"] = "local"
    EMBEDDING_MODEL: str = "intfloat/multilingual-e5-large"

    # ── Vector DB ─────────────────────────────────────────────
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_COLLECTION: str = "rag_edu"

    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/rag_edu"

    # ── Auth ──────────────────────────────────────────────────
    SECRET_KEY: str = "dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── App ───────────────────────────────────────────────────
    APP_ENV: Literal["development", "production"] = "development"
    LOG_LEVEL: str = "DEBUG"

    # ── RAG tuning ────────────────────────────────────────────
    CHUNK_MAX_CHARS: int = 1000
    CHUNK_MAX_OVERLAP: int = 200
    RETRIEVER_TOP_K: int = 10        # lấy nhiều trước khi rerank
    RERANKER_TOP_N: int = 4          # sau rerank còn lại bao nhiêu

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Singleton settings — gọi get_settings() ở bất kỳ đâu."""
    return Settings()
