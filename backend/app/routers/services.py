# backend/app/routers/services.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional

from ..database import get_db
from .. import models, schemas, deps

router = APIRouter()

# Role guards
OwnerOnly = deps.require_roles("owner")
OwnerOrReception = deps.require_roles("owner", "receptionist")

# =========================
# Services (manage services)
# =========================

@router.get("/", response_model=List[schemas.ServiceOut], tags=["services"])
def list_services(
    category: Optional[str] = Query(None, description="Optional category filter (e.g. 'hair')"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOrReception),
):
    q = db.query(models.Service)
    if category and category.strip():
        q = q.filter(models.Service.category.ilike(category.strip()))
    return q.order_by(models.Service.name.asc()).all()

@router.post("/", response_model=schemas.ServiceOut, tags=["services"])
def create_service(
    payload: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    svc = models.Service(
        name=payload.name.strip(),
        duration_minutes=int(payload.duration_minutes),
        price=float(payload.price or 0),
        category=(payload.category.strip().lower() if payload.category else None),
    )
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc

@router.put("/{service_id}", response_model=schemas.ServiceOut, tags=["services"])
def update_service_put(
    service_id: int,
    payload: schemas.ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    svc = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    if payload.name is not None:
        svc.name = payload.name.strip()
    if payload.duration_minutes is not None:
        svc.duration_minutes = int(payload.duration_minutes)
    if payload.price is not None:
        svc.price = float(payload.price)
    if payload.category is not None:
        svc.category = payload.category.strip().lower() if payload.category else None

    db.commit()
    db.refresh(svc)
    return svc

@router.patch("/{service_id}", response_model=schemas.ServiceOut, tags=["services"])
def update_service_patch(
    service_id: int,
    payload: schemas.ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    # Same as PUT for this simple model
    return update_service_put(service_id, payload, db, current_user)

@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["services"])
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    svc = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(svc)
    db.commit()
    return None


# ============================
# Specialties (manage categories)
# ============================

@router.get("/specialties", response_model=List[schemas.SpecialtyOut], tags=["services"])
def list_specialties(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOrReception),
):
    return db.query(models.Specialty).order_by(models.Specialty.slug.asc()).all()

@router.post("/specialties", response_model=schemas.SpecialtyOut, tags=["services"])
def create_specialty(
    payload: schemas.SpecialtyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    slug = payload.slug.strip().lower().replace(" ", "-")
    spec = models.Specialty(slug=slug, label=(payload.label.strip() if payload.label else None))
    db.add(spec)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Specialty slug already exists")
    db.refresh(spec)
    return spec

@router.put("/specialties/{specialty_id}", response_model=schemas.SpecialtyOut, tags=["services"])
def update_specialty_put(
    specialty_id: int,
    payload: schemas.SpecialtyUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    spec = db.query(models.Specialty).filter(models.Specialty.id == specialty_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="Specialty not found")

    if payload.slug is not None:
        spec.slug = payload.slug.strip().lower().replace(" ", "-")
    if payload.label is not None:
        spec.label = payload.label.strip() or None

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Specialty slug already exists")
    db.refresh(spec)
    return spec

@router.patch("/specialties/{specialty_id}", response_model=schemas.SpecialtyOut, tags=["services"])
def update_specialty_patch(
    specialty_id: int,
    payload: schemas.SpecialtyUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    return update_specialty_put(specialty_id, payload, db, current_user)

@router.delete("/specialties/{specialty_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["services"])
def delete_specialty(
    specialty_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    spec = db.query(models.Specialty).filter(models.Specialty.id == specialty_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="Specialty not found")
    db.delete(spec)
    db.commit()
    return None