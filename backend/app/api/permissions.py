"""
Permissions API
GET    /permissions/me                  → quyền thực tế của user hiện tại
GET    /permissions/users               → danh sách staff + quyền (admin only)
GET    /permissions/users/{user_id}     → quyền của 1 user cụ thể (admin only)
PUT    /permissions/users/{user_id}     → cập nhật toàn bộ quyền 1 user (admin only)
PATCH  /permissions/users/{user_id}/{feature_key}  → toggle 1 quyền (admin only)
DELETE /permissions/users/{user_id}     → xóa tất cả override (reset về default role)
GET    /permissions/features            → danh sách feature + default theo role
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db.database import get_db
from app.db import models
from app.db.models import ALL_FEATURES, ROLE_DEFAULT_PERMISSIONS, UserPermission
from app.core.db_dependencies import (
    get_current_db_user,
    get_admin_user,
    get_user_effective_permissions,
)

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class FeatureMeta(BaseModel):
    key: str
    label: str
    description: str

class UserPermissionRow(BaseModel):
    user_id: int
    username: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    is_active: bool
    effective_permissions: dict[str, bool]   # {feature_key: is_allowed}
    has_overrides: bool                       # True nếu có bất kỳ override nào

    class Config:
        from_attributes = True

class BulkPermissionUpdate(BaseModel):
    """Cập nhật toàn bộ quyền cho 1 user cùng lúc."""
    permissions: dict[str, bool]   # {feature_key: is_allowed}

class SinglePermissionUpdate(BaseModel):
    is_allowed: bool


# ── Feature metadata ───────────────────────────────────────────────────────

FEATURE_META: list[dict] = [
    {"key": "records",      "label": "Quản lý tài liệu",     "description": "Xem, tải lên và xóa tài liệu trong hệ thống"},
    {"key": "faq",          "label": "Quản lý FAQ",           "description": "Thêm, sửa, xóa câu hỏi thường gặp"},
    {"key": "feedback",     "label": "Phản hồi người dùng",  "description": "Xem và phân tích phản hồi từ người dùng"},
    {"key": "analytics",    "label": "Thống kê & Báo cáo",   "description": "Xem biểu đồ và số liệu thống kê hệ thống"},
    {"key": "bot_settings", "label": "Cấu hình Chatbot",     "description": "Chỉnh system prompt, nhiệt độ và thông số bot"},
    {"key": "accounts",     "label": "Quản lý tài khoản",    "description": "Tạo, sửa, khóa tài khoản người dùng"},
]


# ── Helper ─────────────────────────────────────────────────────────────────

def _build_user_permission_row(user: models.User, db: Session) -> UserPermissionRow:
    effective = get_user_effective_permissions(user, db)
    role_defaults = ROLE_DEFAULT_PERMISSIONS.get(user.role, set())
    overrides = {p.feature_key for p in user.permissions}

    return UserPermissionRow(
        user_id=user.id,
        username=user.username,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        role=user.role,
        is_active=user.is_active,
        effective_permissions=effective,
        has_overrides=len(user.permissions) > 0,
    )


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/features", response_model=list[dict])
def get_features():
    """Danh sách features + nhãn tiếng Việt + default permission theo role."""
    result = []
    for meta in FEATURE_META:
        result.append({
            **meta,
            "role_defaults": {
                role: (meta["key"] in perms)
                for role, perms in ROLE_DEFAULT_PERMISSIONS.items()
            }
        })
    return result


@router.get("/me")
def get_my_permissions(
    current_user: models.User = Depends(get_current_db_user),
    db: Session = Depends(get_db),
):
    """Quyền thực tế của user đang đăng nhập — dùng cho frontend sidebar."""
    return get_user_effective_permissions(current_user, db)


@router.get("/users", response_model=list[UserPermissionRow])
def get_all_user_permissions(
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Danh sách staff + admin + quyền của từng người (admin only)."""
    users = (
        db.query(models.User)
        .filter(models.User.role.in_(["staff", "admin"]))
        .order_by(models.User.role, models.User.username)
        .all()
    )
    return [_build_user_permission_row(u, db) for u in users]


@router.get("/users/{user_id}", response_model=UserPermissionRow)
def get_user_permissions(
    user_id: int,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return _build_user_permission_row(user, db)


@router.put("/users/{user_id}")
def update_user_permissions(
    user_id: int,
    payload: BulkPermissionUpdate,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """
    Cập nhật toàn bộ quyền cho 1 user.
    Chỉ lưu những quyền KHÁC với role default (tiết kiệm storage).
    Quyền giống default → xóa override (về fallback tự nhiên).
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể tự sửa quyền của mình")

    role_defaults = ROLE_DEFAULT_PERMISSIONS.get(user.role, set())

    # Xóa toàn bộ override cũ
    db.query(UserPermission).filter(UserPermission.user_id == user_id).delete()

    # Chỉ thêm override cho những feature KHÁC default
    for feat_key, is_allowed in payload.permissions.items():
        if feat_key not in ALL_FEATURES:
            continue
        default_val = feat_key in role_defaults
        if is_allowed != default_val:
            db.add(UserPermission(
                user_id=user_id,
                feature_key=feat_key,
                is_allowed=is_allowed,
            ))

    db.commit()
    return {"message": f"Đã cập nhật quyền cho {user.username}"}


@router.patch("/users/{user_id}/{feature_key}")
def toggle_single_permission(
    user_id: int,
    feature_key: str,
    payload: SinglePermissionUpdate,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Toggle 1 quyền cụ thể cho 1 user."""
    if feature_key not in ALL_FEATURES:
        raise HTTPException(status_code=400, detail=f"Feature '{feature_key}' không tồn tại")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể tự sửa quyền của mình")

    role_defaults = ROLE_DEFAULT_PERMISSIONS.get(user.role, set())
    default_val = feature_key in role_defaults

    if payload.is_allowed == default_val:
        # Giống default → xóa override (không cần lưu)
        db.query(UserPermission).filter(
            UserPermission.user_id == user_id,
            UserPermission.feature_key == feature_key,
        ).delete()
    else:
        # Khác default → upsert override
        existing = (
            db.query(UserPermission)
            .filter(UserPermission.user_id == user_id, UserPermission.feature_key == feature_key)
            .first()
        )
        if existing:
            existing.is_allowed = payload.is_allowed
        else:
            db.add(UserPermission(user_id=user_id, feature_key=feature_key, is_allowed=payload.is_allowed))

    db.commit()
    return {"message": "OK", "feature": feature_key, "is_allowed": payload.is_allowed}


@router.delete("/users/{user_id}")
def reset_user_permissions(
    user_id: int,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Xóa toàn bộ override → user về quyền mặc định của role."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    deleted = db.query(UserPermission).filter(UserPermission.user_id == user_id).delete()
    db.commit()
    return {"message": f"Đã reset {deleted} override về mặc định role '{user.role}'"}