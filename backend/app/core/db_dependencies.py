"""
DB Dependencies — get_current_db_user, get_admin_user, get_staff_user,
                  has_feature_permission, require_feature

Đọc token từ HttpOnly Cookie (thống nhất với auth.py).
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.database import get_db
from app.db import models
from app.db.models import ROLE_DEFAULT_PERMISSIONS, UserPermission


def get_current_db_user(
    request: Request,
    db: Session = Depends(get_db),
) -> models.User:
    """Đọc token từ HttpOnly cookie 'access_token' — thống nhất với auth.py."""
    token = request.cookies.get("access_token")

    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token không hợp lệ hoặc đã hết hạn",
    )

    if not token:
        raise exc

    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise exc
    except JWTError:
        raise exc

    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not user.is_active:
        raise exc
    return user


def get_admin_user(
    current_user: models.User = Depends(get_current_db_user),
) -> models.User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thực hiện hành động này",
        )
    return current_user


def get_staff_user(
    current_user: models.User = Depends(get_current_db_user),
) -> models.User:
    """Cho phép cả admin lẫn staff."""
    if current_user.role not in ("admin", "staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thực hiện hành động này",
        )
    return current_user


# ── Permission helpers ─────────────────────────────────────────────────────

def has_feature_permission(user: models.User, feature_key: str, db: Session) -> bool:
    if user.role == "admin":
        return True

    override = (
        db.query(UserPermission)
        .filter(
            UserPermission.user_id == user.id,
            UserPermission.feature_key == feature_key,
        )
        .first()
    )
    if override is not None:
        return override.is_allowed

    return feature_key in ROLE_DEFAULT_PERMISSIONS.get(user.role, set())


def require_feature(feature_key: str):
    def _check(
        current_user: models.User = Depends(get_current_db_user),
        db: Session = Depends(get_db),
    ) -> models.User:
        if not has_feature_permission(current_user, feature_key, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn không có quyền truy cập chức năng '{feature_key}'",
            )
        return current_user

    return _check


def get_user_effective_permissions(user: models.User, db: Session) -> dict[str, bool]:
    from app.db.models import ALL_FEATURES

    overrides: dict[str, bool] = {
        p.feature_key: p.is_allowed
        for p in db.query(UserPermission).filter(UserPermission.user_id == user.id).all()
    }
    role_defaults = ROLE_DEFAULT_PERMISSIONS.get(user.role, set())

    result = {}
    for feat in ALL_FEATURES:
        if user.role == "admin":
            result[feat] = True
        elif feat in overrides:
            result[feat] = overrides[feat]
        else:
            result[feat] = feat in role_defaults

    return result