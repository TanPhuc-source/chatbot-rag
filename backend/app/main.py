from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import chat, upload
from app.core.exceptions import register_exception_handlers
from app.rag.embeddings import get_embedding_provider
from app.rag.llm_provider import get_llm_provider
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Khởi động: load models trước khi nhận request."""
    logger.info("🚀 Starting RAG Edu backend...")
    get_embedding_provider()   # load embedding model vào memory
    get_llm_provider()         # khởi tạo LLM client
    logger.info("✅ Models loaded. Ready to serve.")
    yield
    logger.info("👋 Shutting down.")


app = FastAPI(
    title="RAG Edu API",
    version="1.0.0",
    description="Hệ thống tư vấn học thuật dùng RAG",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Người 1
app.include_router(chat.router,   prefix="/chat",   tags=["Chat"])
app.include_router(upload.router, prefix="/upload", tags=["Upload"])

# Người 2 sẽ thêm vào đây
# app.include_router(auth.router,    prefix="/auth",    tags=["Auth"])
# app.include_router(upload.router,  prefix="/upload",  tags=["Upload"])
# app.include_router(history.router, prefix="/history", tags=["History"])
# app.include_router(admin.router,   prefix="/admin",   tags=["Admin"])

register_exception_handlers(app)


@app.get("/health")
async def health():
    return {"status": "ok"}
