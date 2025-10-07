# backend/app/routers/appointments.py
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Path
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.database import get_db
from app import models, schemas, deps

router = APIRouter()

def _overlap_q(q, start, end):
    # Overlap if existing.start < new.end AND existing.end > new.start
    return q.filter(models.Appointment.start_time < end,
                    models.Appointment.end_time > start)

# ---------- CREATE ----------
@router.post("/", response_model=schemas.AppointmentOut)
def create_appointment(
    appt: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    if appt.end_time <= appt.start_time:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")

    # staff can only create for themselves
    if current_user.role == "staff" and appt.staff_id != current_user.id:
        raise HTTPException(status_code=403, detail="Staff can only create their own appointments")

    # ensure client/staff exist
    client = db.query(models.Client).filter(models.Client.id == appt.client_id).first()
    staff = db.query(models.User).filter(models.User.id == appt.staff_id).first()
    if not client or not staff:
        raise HTTPException(status_code=400, detail="Invalid client or staff id")

    # block overlaps for staff
    conflict = _overlap_q(
        db.query(models.Appointment).filter(models.Appointment.staff_id == appt.staff_id),
        appt.start_time, appt.end_time
    ).first()
    if conflict:
        raise HTTPException(status_code=409, detail=f"Staff already booked {conflict.start_time}–{conflict.end_time}")

    db_appt = models.Appointment(**appt.model_dump())
    db.add(db_appt)
    db.commit()
    db.refresh(db_appt)
    return db_appt

# ---------- LIST ----------
@router.get("/", response_model=List[schemas.AppointmentOut])
def list_appointments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    staff_id: Optional[int] = Query(None),
    client_id: Optional[int] = Query(None),
):
    q = db.query(models.Appointment)

    # role-based filtering
    if current_user.role == "staff":
        q = q.filter(models.Appointment.staff_id == current_user.id)
    else:
        if staff_id:
            q = q.filter(models.Appointment.staff_id == staff_id)
    if client_id:
        q = q.filter(models.Appointment.client_id == client_id)
    if start:
        q = q.filter(models.Appointment.start_time >= start)
    if end:
        q = q.filter(models.Appointment.end_time <= end)

    return q.order_by(models.Appointment.start_time.asc()).all()

# ---------- UPDATE ----------
class AppointmentUpdatePayload(BaseModel):
    # Optional fields: only provided ones are updated
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    service_name: Optional[str] = None
    price: Optional[float] = None
    tip: Optional[float] = None
    notes: Optional[str] = None
    staff_id: Optional[int] = None
    client_id: Optional[int] = None

@router.put("/{appointment_id}", response_model=schemas.AppointmentOut)
def update_appointment(
    appointment_id: int = Path(...),
    payload: AppointmentUpdatePayload = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Permissions:
    # - owner & receptionist: can edit any
    # - staff: only their own
    if current_user.role == "staff" and appt.staff_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    data = payload.model_dump(exclude_unset=True)

    # staff cannot reassign staff/client
    if current_user.role == "staff":
        data.pop("staff_id", None)
        data.pop("client_id", None)

    # Apply changes
    for k, v in data.items():
        setattr(appt, k, v)

    # Sanity
    if appt.end_time <= appt.start_time:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")

    # Check overlaps for the (possibly changed) staff/time
    q = db.query(models.Appointment).filter(
        models.Appointment.staff_id == appt.staff_id,
        models.Appointment.id != appt.id,  # ignore self
    )
    conflict = _overlap_q(q, appt.start_time, appt.end_time).first()
    if conflict:
        raise HTTPException(status_code=409, detail=f"Staff already booked {conflict.start_time}–{conflict.end_time}")

    db.commit()
    db.refresh(appt)
    return appt

# ---------- ADD PRODUCT SALE ----------
class AddSalePayload(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)
    total_price: Optional[float] = None  # if None, use product.price * quantity

@router.post("/{appointment_id}/add_sale", status_code=201)
def add_sale_to_appointment(
    appointment_id: int,
    payload: AddSalePayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # owner/receptionist can add; staff only if it's their appt
    if current_user.role == "staff" and appt.staff_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    prod = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    price_each = float(prod.price or 0.0)
    total = float(payload.total_price) if payload.total_price is not None else price_each * payload.quantity

    sale = models.Sale(
        product_id=prod.id,
        staff_id=appt.staff_id,
        client_id=appt.client_id,
        appointment_id=appt.id,
        quantity=payload.quantity,
        total_price=total,
        created_at=datetime.utcnow(),
    )
    db.add(sale)
    db.commit()
    return {"ok": True, "sale_id": sale.id}

# ---------- DELETE (also remove sales tied to appt) ----------
@router.delete("/{appointment_id}", status_code=204)
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    obj = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # staff can only delete their own
    if current_user.role == "staff" and obj.staff_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Defensive cleanup to keep earnings correct if FKs don't cascade
    db.query(models.Sale).filter(models.Sale.appointment_id == appointment_id).delete(synchronize_session=False)

    db.delete(obj)
    db.commit()
    return Response(status_code=204)