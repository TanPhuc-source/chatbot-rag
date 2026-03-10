from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import chat, upload, auth, admin, history
from app.core.exceptions import register_exception_handlers
from app.db.database import Base, engine
from app.rag.embeddings import get_embedding_provider
from app.rag.llm_provider import get_llm_provider
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tạo bảng PostgreSQL nếu chưa có
    Base.metadata.create_all(bind=engine)
    logger.info("✅ PostgreSQL tables ready.")

    # Load RAG models vào memory
    logger.info("🚀 Starting RAG Edu backend...")
    get_embedding_provider()
    get_llm_provider()
    logger.info("✅ Models loaded. Ready to serve.")
    yield
    logger.info("👋 Shutting down.")


app = FastAPI(
    title="RAG Edu API",
    version="1.0.0",
    description="Hệ thống tư vấn học thuật dùng RAG — TTNN&TH ĐH Đồng Tháp",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Người 1: RAG core ─────────────────────────────────────────────────────
app.include_router(chat.router,    prefix="/chat",    tags=["Chat"])
app.include_router(upload.router,  prefix="/upload",  tags=["Upload"])

# ── Người 2: Auth / Admin / History ──────────────────────────────────────
app.include_router(auth.router,    prefix="/auth",    tags=["Auth"])
app.include_router(admin.router,   prefix="/admin",   tags=["Admin"])
app.include_router(history.router, prefix="/history", tags=["History"])

register_exception_handlers(app)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}