from pathlib import Path
import os
import secrets

from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from . import models, deps  # ensure models imported; deps for role guard
from .routers import public

# Routers
from .auth import router as auth_router
from .routers import (
    clients,
    appointments,
    products,
    sales,
    earnings,
    time,
    payments,
    users,
)
from .routers import services as services_router  # <-- alias for clarity

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Image & Style API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later if desired
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

# --- Public booking page (served by this backend) ---
# points to backend/public
PUBLIC_DIR = (Path(__file__).resolve().parent.parent / "public").resolve()

@app.get("/booking.html")
def booking_html():
    return FileResponse(PUBLIC_DIR / "booking.html")

@app.get("/booking")
def booking_alias():
    return FileResponse(PUBLIC_DIR / "booking.html")


# --- Static uploads (for avatar photos) ---
UPLOAD_DIR = (Path(__file__).resolve().parent.parent / "uploads").resolve()
AVATAR_DIR = (UPLOAD_DIR / "avatars")
AVATAR_DIR.mkdir(parents=True, exist_ok=True)

# Expose /uploads so RN Image can load avatar_url directly
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.post("/upload/avatar")
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    # Require a signed-in user (pick which roles you want to allow)
    current_user: models.User = Depends(deps.require_roles("owner", "receptionist", "staff")),
):
    """
    Accepts an image file and stores it under uploads/avatars/.
    Returns a JSON object with a public URL that the app can use as avatar_url.
    """
    # Validate type
    allowed = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"}
    if (file.content_type or "").lower() not in allowed:
        raise HTTPException(status_code=400, detail="Invalid image type")

    # Size cap (5MB)
    MAX_BYTES = 5 * 1024 * 1024
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")

    # Safe file name
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]:
        ext = ".jpg"
    name = f"{secrets.token_hex(16)}{ext}"
    dest = AVATAR_DIR / name

    # Save file
    with open(dest, "wb") as f:
        f.write(data)

    # Absolute URL for direct display in the app
    url = str(request.url_for("uploads", path=f"avatars/{name}"))

    return {"url": url}


# --- API Routers ---
app.include_router(auth_router,              prefix="/auth",         tags=["auth"])
app.include_router(clients.router,           prefix="/clients",      tags=["clients"])
app.include_router(appointments.router,      prefix="/appointments", tags=["appointments"])
app.include_router(products.router,          prefix="/products",     tags=["products"])
app.include_router(sales.router,             prefix="/sales",        tags=["sales"])
app.include_router(earnings.router,          prefix="/earnings",     tags=["earnings"])
app.include_router(time.router,              prefix="/time",         tags=["time"])
app.include_router(payments.router,          prefix="/payments",     tags=["payments"])
app.include_router(users.router,             prefix="/users",        tags=["users"])
app.include_router(services_router.router,   prefix="/services",     tags=["services"])  # owner CRUD for services
app.include_router(public.router,            prefix="/public",       tags=["public"])
