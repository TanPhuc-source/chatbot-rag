# backend/schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- QUẢN LÝ USER ---
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True  # Pydantic v2

# --- AUTH TOKEN ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    email: Optional[str] = None # Đổi từ username sang email cho chuẩn bảo mật
    role: Optional[str] = None

# --- QUẢN LÝ DOCUMENT ---
class DocumentResponse(BaseModel):
    id: int
    filename: str
    status: str
    uploaded_by: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- QUẢN LÝ CHAT ---
class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    id: int
    title: str = "Cuộc trò chuyện mới"
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    role: str # 'user' hoặc 'admin'

# --- QUẢN LÝ CHAT ---
class ChatSessionCreate(BaseModel):
    title: str = "Cuộc trò chuyện mới"

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    
    class Config:
        from_attributes = True