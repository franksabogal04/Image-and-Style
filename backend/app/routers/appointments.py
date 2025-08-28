
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from ..database import get_db
from .. import models, schemas, deps

router = APIRouter()

@router.post("/", response_model=schemas.AppointmentOut)
def create_appointment(appt: schemas.AppointmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    # Basic sanity: times
    if appt.end_time <= appt.start_time:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")
    # Ensure client/staff exist
    client = db.query(models.Client).filter(models.Client.id == appt.client_id).first()
    staff = db.query(models.User).filter(models.User.id == appt.staff_id).first()
    if not client or not staff:
        raise HTTPException(status_code=400, detail="Invalid client or staff id")
    db_appt = models.Appointment(**appt.model_dump())
    db.add(db_appt)
    db.commit()
    db.refresh(db_appt)
    return db_appt

@router.get("/", response_model=List[schemas.AppointmentOut])
def list_appointments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
):
    q = db.query(models.Appointment)
    if start:
        q = q.filter(models.Appointment.start_time >= start)
    if end:
        q = q.filter(models.Appointment.end_time <= end)
    return q.order_by(models.Appointment.start_time.asc()).all()
