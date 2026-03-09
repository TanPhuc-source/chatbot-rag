import os
import shutil
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
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

# --- KHỞI TẠO TÀI NGUYÊN ---
app = FastAPI(title="Chatbot RAG API", description="API cho hệ thống Chatbot RAG")

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

@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã được sử dụng")
    
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role="user" # Mặc định là user thường
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
    return {"access_token": access_token, "token_type": "bearer"}

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


# --- XỬ LÝ UPLOAD VÀ BACKGROUND TASK ---
def process_extracted_document(document_id: int, file_path: str):
    db = SessionLocal()
    try:
        doc = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not doc:
            return
            
        doc.status = "processing"
        db.commit()

        # TODO: Code bóc tách Text và Embedding của NGƯỜI SỐ 1 sẽ nằm ở đây
        
        doc.status = "indexed"
        db.commit()
    except Exception as e:
        print(f"Lỗi xử lý file {document_id}: {e}")
        doc.status = "error"
        db.commit()
    finally:
        db.close()

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