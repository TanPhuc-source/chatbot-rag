# backend/init_db.py
from database import engine, Base
import models  # Import models để SQLAlchemy nhận diện được các class

def init_db():
    print("Đang tạo các bảng trong PostgreSQL...")
    # Lệnh này sẽ quét các models kế thừa từ Base và tạo bảng nếu chưa có
    Base.metadata.create_all(bind=engine)
    print("Tạo bảng thành công!")

if __name__ == "__main__":
    init_db()