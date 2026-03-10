import os
import shutil
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv

from database import SessionLocal, engine
import models
import schemas

import asyncio
from kreuzberg import extract_file
load_dotenv()

models.Base.metadata.create_all(bind=engine) # Tạo bảng nếu chưa tồn tại
# --- KHỞI TẠO TÀI NGUYÊN ---
app = FastAPI(title="Chatbot RAG API", description="API cho hệ thống Chatbot RAG")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phép tất cả domain (có thể chỉnh lại cho an toàn hơn)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tạo thư mục lưu file upload
UPLOAD_DIR = "data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- CẤU HÌNH BẢO MẬT ---
SECRET_KEY = os.getenv("SECRET_KEY", "chuoi_bao_mat_cua_ban_doi_trong_file_env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # Token sống 1 ngày

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- HÀM HỖ TRỢ BẢO MẬT ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- DATABASE DEPENDENCY ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- HỆ THỐNG AUTH & PHÂN QUYỀN (GIẢI QUYẾT LỖI get_admin_user) ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def get_admin_user(current_user: models.User = Depends(get_current_user)):
    # Cột trong DB của bạn tên là role, giá trị là "admin" hoặc "user"
    if current_user.role != "admin": 
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Bạn không có quyền thực hiện hành động này"
        )
    return current_user


# ==========================================
#               API ROUTES
# ==========================================

@app.get("/")
def read_root():
    return {"message": "Server đang chạy ngon lành! 🚀"}

# backend/main.py

@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Kiểm tra trùng Username
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã được sử dụng")
    
    # 2. Kiểm tra trùng Email
    db_email = db.query(models.User).filter(models.User.email == user.email).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký")
    
    # 3. Mã hóa mật khẩu
    hashed_password = get_password_hash(user.password)
    
    # 4. Lưu User mới với ĐẦY ĐỦ các trường
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role="user", # Mặc định là user thường
        full_name=user.full_name,
        gender=user.gender,
        date_of_birth=user.date_of_birth,
        phone=user.phone,
        address=user.address
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

# --- API CHO ADMIN DASHBOARD ---
@app.get("/admin/documents", response_model=list[schemas.DocumentResponse])
def get_all_documents(
    skip: int = 0, limit: int = 100,
    current_user: models.User = Depends(get_admin_user), 
    db: Session = Depends(get_db)
):
    documents = db.query(models.Document).order_by(models.Document.created_at.desc()).offset(skip).limit(limit).all()
    return documents

@app.get("/admin/users", response_model=list[schemas.UserResponse])
def get_all_users(
    skip: int = 0, limit: int = 100,
    current_user: models.User = Depends(get_admin_user), 
    db: Session = Depends(get_db)
):
    users = db.query(models.User).order_by(models.User.created_at.desc()).offset(skip).limit(limit).all()
    return users

@app.patch("/admin/users/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Cập nhật toàn bộ thông tin user (full_name, gender, email, role...)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")

    # Kiểm tra email unique nếu thay đổi
    if user_update.email and user_update.email != user.email:
        if db.query(models.User).filter(
            models.User.email == user_update.email,
            models.User.id != user_id
        ).first():
            raise HTTPException(status_code=400, detail="Email đã được sử dụng")

    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user

@app.post("/upload")
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    current_user: models.User = Depends(get_admin_user), 
    db: Session = Depends(get_db)
):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    new_doc = models.Document(
        filename=file.filename,
        file_path=file_path,
        status="uploaded", 
        uploaded_by=current_user.id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    background_tasks.add_task(process_extracted_document, new_doc.id, file_path)
    
    return {
        "message": "Upload thành công! Tài liệu đang được AI xử lý ngầm.", 
        "document_id": new_doc.id,
        "status": new_doc.status
    }

async def extract_text_from_file(file_path: str) -> str:
    """Hàm phụ trợ dùng Kreuzberg để bóc tách text (hỗ trợ cả OCR)"""
    # Kreuzberg là thư viện async, nên cần dùng await
    result = await extract_file(file_path)
    return result.content

def process_extracted_document(document_id: int, file_path: str):
    db = SessionLocal()
    try:
        doc = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not doc:
            return
            
        doc.status = "processing"
        db.commit()

        # 1. Bóc tách Text
        # Vì hàm này chạy ngầm đồng bộ (sync), ta dùng asyncio.run để gọi hàm async
        text_content = asyncio.run(extract_text_from_file(file_path))
        
        print(f"Đã trích xuất thành công {len(text_content)} ký tự từ file {doc.filename}")

        # 2. TODO: Gọi hàm Chunking + Embedding của NGƯỜI SỐ 1
        # person1_pipeline.embed_to_chroma(text_content, document_id)
        
        doc.status = "indexed" 
        db.commit()
    except Exception as e:
        print(f"Lỗi xử lý file {document_id}: {e}")
        doc.status = "error"
        db.commit()
    finally:
        db.close()

# ==========================================
#         API LỊCH SỬ HỘI THOẠI (CHAT)
# ==========================================

@app.post("/chat/sessions", response_model=schemas.ChatSessionResponse)
def create_chat_session(
    session_in: schemas.ChatSessionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tạo một phiên chat mới"""
    new_session = models.ChatSession(
        title=session_in.title,
        user_id=current_user.id
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@app.get("/chat/sessions", response_model=list[schemas.ChatSessionResponse])
def get_chat_sessions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách các phiên chat của user hiện tại"""
    sessions = db.query(models.ChatSession)\
                 .filter(models.ChatSession.user_id == current_user.id)\
                 .order_by(models.ChatSession.created_at.desc())\
                 .all()
    return sessions

@app.get("/chat/sessions/{session_id}/messages", response_model=list[schemas.MessageResponse])
def get_chat_messages(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy toàn bộ tin nhắn của một phiên chat cụ thể"""
    # Kiểm tra xem session này có thuộc về user hiện tại không
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")
        
    messages = db.query(models.ChatMessage)\
                 .filter(models.ChatMessage.session_id == session_id)\
                 .order_by(models.ChatMessage.created_at.asc())\
                 .all()
    return messages

@app.delete("/chat/sessions/{session_id}")
def delete_chat_session(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Xóa một phiên chat và toàn bộ tin nhắn bên trong"""
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")
        
    db.delete(session)
    db.commit()
    return {"message": "Đã xóa phiên chat thành công"}

@app.delete("/admin/documents/{document_id}")
def delete_document(
    document_id: int,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Xóa tài liệu khỏi hệ thống"""
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    
    # Xóa file vật lý trên ổ cứng (nếu tồn tại)
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
        
    # Xóa record trong database
    db.delete(doc)
    db.commit()
    
    # TODO: Cần có cơ chế hoặc API để báo cho Người 1 xóa Embedding trong ChromaDB
    
    return {"message": f"Đã xóa tài liệu {doc.filename} thành công"}

@app.patch("/admin/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role_update: schemas.UserRoleUpdate,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Cập nhật quyền hạn của user (Cấp quyền Admin)"""
    if role_update.role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Role không hợp lệ. Chỉ chấp nhận 'user' hoặc 'admin'")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")
        
    user.role = role_update.role
    db.commit()
    return {"message": f"Đã cập nhật quyền của {user.username} thành {user.role}"}

    # Mở file backend/main.py, kéo xuống phần API dành cho Admin và dán đoạn này vào

@app.patch("/admin/users/{user_id}/toggle-status")
def toggle_user_status(
    user_id: int,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Khóa / Mở khóa tài khoản (Chỉ Admin)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản này")
    
    # Không cho phép admin tự khóa tài khoản của chính mình
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Bạn không thể tự khóa tài khoản của mình!")
        
    user.is_active = not user.is_active # Đảo ngược trạng thái
    db.commit()
    
    action = "Mở khóa" if user.is_active else "Khóa"
    return {"message": f"Đã {action} tài khoản {user.username} thành công!"}