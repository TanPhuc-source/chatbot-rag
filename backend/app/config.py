from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
from typing import Literal


class Settings(BaseSettings):
    # ── LLM Provider ──────────────────────────────────────────
    LLM_PROVIDER: Literal["groq", "ollama", "openai", "gemini"] = "groq"

    BASE_URL: str = "http://localhost:8000"
    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Ollama (local)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:7b"

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"          

    # Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"     

    # ── Embedding Provider ────────────────────────────────────
    EMBEDDING_PROVIDER: Literal["local"] = "local"
    EMBEDDING_MODEL: str = "BAAI/bge-m3"

    # ── Vector DB ─────────────────────────────────────────────
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_COLLECTION: str = "rag_edu"

    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/rag_edu"

    # ── Auth & Security ───────────────────────────────────────
    SECRET_KEY: str = Field(..., description="Khóa bảo mật JWT")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── Email / SMTP ──────────────────────────────────────────
    SMTP_SENDER_EMAIL: str = Field(..., description="Email dùng để gửi thông báo")
    SMTP_SENDER_PASSWORD: str = Field(..., description="App Password của email")

    # ── App ───────────────────────────────────────────────────
    APP_ENV: Literal["development", "production"] = "development"
    LOG_LEVEL: str = "DEBUG"

    # ── RAG tuning ────────────────────────────────────────────
    CHUNK_MAX_CHARS: int = 1000
    CHUNK_MAX_OVERLAP: int = 200
    RETRIEVER_TOP_K: int = 5
    RERANKER_TOP_N: int = 3

    # ── RAG Advanced Features ─────────────────────────────────
    ENABLE_HYDE: bool = True
    ENABLE_QUERY_TRANSFORM: bool = True
    QUERY_TRANSFORM_N: int = 3
    ENABLE_CONTEXTUAL_HEADERS: bool = True

    # ── File Storage ──────────────────────────────────────────
    UPLOAD_DIR: str = "uploads/documents"

    # ── Image OCR & Table Extraction ──────────────────────────
    ENABLE_IMAGE_OCR: bool = True
    ENABLE_TABLE_EXTRACTION: bool = True
    OCR_USE_AI_FALLBACK: bool = True
    GROQ_VISION_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    ANTHROPIC_API_KEY: str = ""
    CONTEXTUAL_HEADERS_MAX_CHUNKS: int = 200

    # ── App ───────────────────────────────────────────────────
    APP_ENV: Literal["development", "production"] = "development"
    FRONTEND_URL: str = Field(
        default="http://localhost:3000", 
        description="URL của Frontend khi chạy Production (VD: https://chat.dthu.edu.vn)"
    )
    LOG_LEVEL: str = "DEBUG"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()