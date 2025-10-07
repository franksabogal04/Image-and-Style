from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from .. import models, schemas, deps

router = APIRouter()

# Role guards
OwnerOnly = deps.require_roles("owner")
OwnerOrReception = deps.require_roles("owner", "receptionist")

@router.get("/", response_model=List[schemas.ServiceOut])
def list_services(
    category: Optional[str] = Query(None, description="Optional category filter (e.g. 'hair')"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOrReception),
):
    q = db.query(models.Service)
    if category and category.strip():
        q = q.filter(models.Service.category.ilike(category.strip()))
    return q.order_by(models.Service.name.asc()).all()

@router.post("/", response_model=schemas.ServiceOut)
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

@router.put("/{service_id}", response_model=schemas.ServiceOut)
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

@router.patch("/{service_id}", response_model=schemas.ServiceOut)
def update_service_patch(
    service_id: int,
    payload: schemas.ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(OwnerOnly),
):
    # Same as PUT; patch semantics are acceptable with this simple model
    return update_service_put(service_id, payload, db, current_user)

@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
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