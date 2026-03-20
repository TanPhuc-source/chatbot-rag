import os
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.api import chat, upload, auth, admin, history, feedback, bot_settings, faq, analytics
from app.core.exceptions import register_exception_handlers
from app.db.database import Base, engine
from app.rag.embeddings import get_embedding_provider
from app.rag.llm_provider import get_llm_provider
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("✅ PostgreSQL tables ready.")
    logger.info("🚀 Starting RAG Edu backend...")
    get_embedding_provider()
    get_llm_provider()
    logger.info("✅ Models loaded. Ready to serve.")
    yield
    logger.info("👋 Shutting down.")


app = FastAPI(
    # title="RAG Edu API",
    # version="1.0.0",
    # description="Hệ thống tư vấn học thuật dùng RAG — TTNN&TH ĐH Đồng Tháp",
    # lifespan=lifespan,
)

# Định nghĩa cấu trúc Settings
class SettingsUpdate(BaseModel):
    themeColor: str
    welcomeTitle: str
    welcomeSubtitle: str
    schoolName: str
    schoolDept: str
    faq1: str
    faq2: str
    faq3: str
    faq4: str


SETTINGS_FILE = "settings.json"

# Hàm đọc file
def get_current_settings():
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    # Nếu chưa có file, trả về mặc định
    return {
        "themeColor": "#1a5fb4",
        "welcomeTitle": "Xin chào! 👋",
        "welcomeSubtitle": "Tôi có thể giúp gì cho bạn?",
        "schoolName": "Trường Đại Học Đồng Tháp",
        "schoolDept": "Trung Tâm Ngoại Ngữ Và Tin Học"
    }

# 1. API GỬI SETTINGS CHO FRONTEND
@app.get("/settings")
def read_settings():
    return get_current_settings()

# 2. API LƯU SETTINGS TỪ ADMIN (Quan trọng nhất)
@app.put("/settings")
def update_settings(settings: SettingsUpdate): # Thêm Depends(verify_token) nếu có xác thực admin
    # Lưu vào file JSON
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings.dict(), f, ensure_ascii=False, indent=4)
    return {"message": "Cập nhật thành công", "data": settings}

os.makedirs("uploads/avatars", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Core ──────────────────────────────────────────────────────────────────
app.include_router(chat.router,         prefix="/chat",     tags=["Chat"])
app.include_router(upload.router,       prefix="/upload",   tags=["Upload"])

# ── Auth / Admin / History ────────────────────────────────────────────────
app.include_router(auth.router,         prefix="/auth",     tags=["Auth"])
app.include_router(admin.router,        prefix="/admin",    tags=["Admin"])
app.include_router(history.router,      prefix="/history",  tags=["History"])

# ── Tính năng mới ─────────────────────────────────────────────────────────
app.include_router(feedback.router,     prefix="/feedback", tags=["Feedback"])
app.include_router(bot_settings.router, prefix="/settings", tags=["Settings"])
app.include_router(faq.router,          prefix="/faq",      tags=["FAQ"])
app.include_router(analytics.router,    prefix="/analytics",tags=["Analytics"])

register_exception_handlers(app)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}