# backend/app/routers/uploads.py
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pathlib import Path
import os, uuid, shutil

from ..database import get_db
from .. import models, deps

router = APIRouter()

# Anyone logged in can upload; change to OwnerOnly if you want only owners:
AnyAuthed = deps.require_roles("owner", "receptionist", "staff")

# /app/public/uploads/avatars (served under /public)
BASE_DIR = Path(__file__).resolve().parents[1]
AVATAR_DIR = BASE_DIR / "public" / "uploads" / "avatars"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED = {".jpg", ".jpeg", ".png", ".webp"}

@router.post("/uploads/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(AnyAuthed),
):
    # Basic content checks
    filename = file.filename or "avatar.jpg"
    ext = os.path.splitext(filename)[1].lower() or ".jpg"
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail="Only JPG/PNG/WebP images are allowed.")

    # Save with a random name
    new_name = f"{uuid.uuid4().hex}{ext}"
    dest = AVATAR_DIR / new_name
    with dest.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    # Public URL (served by StaticFiles at /public)
    public_url = f"/public/uploads/avatars/{new_name}"
    return {"url": public_url}