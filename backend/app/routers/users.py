from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
from urllib.parse import urlparse
import os

from ..database import get_db
from .. import models, schemas, deps
from ..auth import get_password_hash

router = APIRouter()

# Role guards
OwnerOnly = deps.require_roles("owner")
OwnerOrReception = deps.require_roles("owner", "receptionist")

# Compute avatar folder on disk for cleanup
AVATAR_DIR = (Path(__file__).resolve().parent.parent.parent / "uploads" / "avatars").resolve()

def _maybe_delete_local_avatar(avatar_url: Optional[str]):
    """
    Best-effort removal of an avatar file if it's one of our local uploads.
    Only deletes files under UPLOADS/avatars/ to be safe.
    """
    if not avatar_url:
        return
    try:
        path = urlparse(avatar_url).path or ""
        # Expect: /uploads/avatars/<filename>
        parts = path.strip("/").split("/")
        if len(parts) >= 3 and parts[0] == "uploads" and parts[1] == "avatars":
            fname = parts[-1]
            p = (AVATAR_DIR / fname).resolve()
            # ensure path is inside AVATAR_DIR
            if AVATAR_DIR in p.parents or p == AVATAR_DIR / fname:
                if p.exists():
                    p.unlink(missing_ok=True)
    except Exception:
        # ignore cleanup errors
        pass

# A lightweight user shape for lists
class UserLite(schemas.BaseModel):
    id: int
    email: str
    name: str
    role: schemas.RoleEnum
    profession: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[UserLite])
def list_users(
    role: Optional[schemas.RoleEnum] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOrReception),
):
    q = db.query(models.User)
    if role:
        q = q.filter(models.User.role == (role.value if hasattr(role, "value") else str(role)))
    return q.order_by(models.User.name.asc()).all()

@router.post("/", response_model=schemas.UserOut)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    role_str = payload.role.value if hasattr(payload.role, "value") else str(payload.role)
    if role_str not in ("staff", "receptionist"):
        raise HTTPException(status_code=403, detail="Owners can create staff or receptionists only.")

    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    hashed = get_password_hash(payload.password)
    user = models.User(
        email=payload.email,
        name=payload.name,
        role=role_str,
        password_hash=hashed,
        profession=getattr(payload, "profession", None) or None,
        avatar_url=getattr(payload, "avatar_url", None) or None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# --- NEW: update endpoint ---
from pydantic import BaseModel, EmailStr

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[schemas.RoleEnum] = None  # only staff|receptionist allowed here
    profession: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None  # optional password reset

@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Guard: cannot update owner via this endpoint (except maybe avatar/name).
    if user.role == "owner" and payload.role is not None:
        raise HTTPException(status_code=403, detail="Cannot change owner role here.")

    # Email uniqueness
    if payload.email and payload.email != user.email:
        exists = db.query(models.User).filter(models.User.email == payload.email).first()
        if exists and exists.id != user.id:
            raise HTTPException(status_code=400, detail="Email already in use.")

    # Role guard
    if payload.role is not None:
        role_str = payload.role.value if hasattr(payload.role, "value") else str(payload.role)
        if role_str not in ("staff", "receptionist"):
            raise HTTPException(status_code=403, detail="Role must be staff or receptionist.")
        user.role = role_str

    # Name / Email / Profession
    if payload.name is not None:
        user.name = payload.name.strip()
    if payload.email is not None:
        user.email = payload.email
    if payload.profession is not None:
        user.profession = payload.profession.strip() or None

    # Password reset
    if payload.password:
        user.password_hash = get_password_hash(payload.password)

    # Avatar: if changed and old one was local, delete old file
    if payload.avatar_url is not None and payload.avatar_url != user.avatar_url:
        _maybe_delete_local_avatar(user.avatar_url)
        user.avatar_url = payload.avatar_url or None

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),  # owner-only
):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    if target.role == "owner":
        raise HTTPException(status_code=403, detail="Owners cannot be deleted via this endpoint.")

    # Clean up local avatar if any
    _maybe_delete_local_avatar(target.avatar_url)

    db.delete(target)
    db.commit()
    return None