"""
SQLAlchemy models — User, Document, ChatSession, ChatMessage,
                    MessageFeedback, BotSettings, FAQ
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    full_name = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)

    documents = relationship("Document", back_populates="owner")
    chat_sessions = relationship("ChatSession", back_populates="owner")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    file_path = Column(String, nullable=False, default="")
    status = Column(String, default="uploaded")
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="documents")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    role = Column(String)
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")
    feedback = relationship("MessageFeedback", back_populates="message", uselist=False)


class MessageFeedback(Base):
    """Feedback 👍👎 cho từng tin nhắn của bot."""
    __tablename__ = "message_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("chat_messages.id"), unique=True)
    rating = Column(String, nullable=False)   # "up" | "down"
    comment = Column(Text, nullable=True)     # ghi chú thêm (tùy chọn)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    message = relationship("ChatMessage", back_populates="feedback")


class BotSettings(Base):
    """Cấu hình chatbot — chỉ có 1 row (singleton)."""
    __tablename__ = "bot_settings"

    id = Column(Integer, primary_key=True, default=1)
    bot_name = Column(String, default="Trợ lý ĐH Đồng Tháp")
    system_prompt = Column(Text, default="""Bạn là trợ lý học thuật thông minh, hỗ trợ sinh viên và giáo viên.
Nhiệm vụ: trả lời câu hỏi DỰA TRÊN tài liệu được cung cấp bên dưới.

Nguyên tắc:
- Chỉ trả lời dựa trên nội dung trong tài liệu. Không bịa đặt.
- Nếu tài liệu không đủ thông tin, hãy nói rõ điều đó.
- Trả lời bằng ngôn ngữ của câu hỏi (tiếng Việt hoặc tiếng Anh).
- Trích dẫn rõ nguồn (tên file, số trang nếu có) sau mỗi thông tin quan trọng.
- Trình bày rõ ràng, dùng gạch đầu dòng hoặc đánh số khi liệt kê.""")
    temperature = Column(Float, default=0.3)
    max_tokens = Column(Integer, default=1024)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class FAQ(Base):
    """Câu hỏi thường gặp — bot ưu tiên trả lời từ đây trước."""
    __tablename__ = "faqs"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    category = Column(String, nullable=True)   # VD: "Học phí", "Lịch học", ...
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    creator = relationship("User")