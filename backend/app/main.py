import os
from contextlib import asynccontextmanager
from app.config import get_settings

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.limiter import limiter

from app.api import chat, upload, auth, admin, history, feedback, bot_settings, faq, analytics
from app.api import ui_settings
from app.api.ui_settings import UISettings
from app.core.exceptions import register_exception_handlers
from app.db.database import Base, engine
from app.rag.embeddings import get_embedding_provider
from app.rag.llm_provider import get_llm_provider
from app.rag.reranker import _get_ranker
from app.utils.logger import logger
from app.api import permissions
from app.api import forms


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("✅ PostgreSQL tables ready.")
    logger.info("🚀 Starting RAG Edu backend...")
    get_embedding_provider()
    get_llm_provider()
    _get_ranker()
    logger.info("✅ Models loaded. Ready to serve.")
    yield
    logger.info("👋 Shutting down.")


app = FastAPI(lifespan=lifespan)

# ── Trust proxy headers từ ngrok/reverse proxy ────────────────────────────
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

settings = get_settings()

# ── CORS ──────────────────────────────────────────────────────────────────
origins = (
    ["http://localhost:3000", "http://localhost:5173",
     "http://127.0.0.1:3000", "http://127.0.0.1:5173"]
    if settings.APP_ENV == "development"
    else [settings.FRONTEND_URL]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── Rate limiter ──────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── Static files ──────────────────────────────────────────────────────────
os.makedirs("uploads/avatars", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

os.makedirs("static/forms", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── Routers ───────────────────────────────────────────────────────────────
app.include_router(chat.router,         prefix="/chat",        tags=["Chat"])
app.include_router(upload.router,       prefix="/upload",      tags=["Upload"])
app.include_router(auth.router,         prefix="/auth",        tags=["Auth"])
app.include_router(admin.router,        prefix="/admin",       tags=["Admin"])
app.include_router(history.router,      prefix="/history",     tags=["History"])
app.include_router(feedback.router,     prefix="/feedback",    tags=["Feedback"])
app.include_router(bot_settings.router, prefix="/settings",    tags=["Settings"])
app.include_router(faq.router,          prefix="/faq",         tags=["FAQ"])
app.include_router(analytics.router,    prefix="/analytics",   tags=["Analytics"])
app.include_router(ui_settings.router,  prefix="/ui-settings", tags=["UI Settings"])
app.include_router(permissions.router,  prefix="/permissions", tags=["Permissions"])
app.include_router(forms.router,        prefix="/forms",       tags=["Forms"])

register_exception_handlers(app)



@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}