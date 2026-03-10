"""
Database connection — dùng cho toàn bộ app (sync, SQLAlchemy).
"""
from __future__ import annotations

import os

import sqlalchemy
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Tự convert asyncpg → sync nếu .env chỉ có 1 URL
_raw_url = os.getenv("DATABASE_URL", "")
SQLALCHEMY_DATABASE_URL = _raw_url.replace("postgresql+asyncpg://", "postgresql://")

engine = sqlalchemy.create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()