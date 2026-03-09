# backend/database.py
import os
import sqlalchemy
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load biến môi trường từ file .env
load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Kết nối PostgreSQL
engine = sqlalchemy.create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency để sử dụng trong FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()