from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional

from ..database import get_db
from .. import models

router = APIRouter()

# Business hours and slot grid
OPEN_TIME = 9      # 9 AM
CLOSE_TIME = 19    # 7 PM
SLOT_MINUTES = 15  # base grid for availability

def _pad(n: int) -> str:
    return str(n).zfill(2)

def _slots_in_day() -> List[str]:
    out = []
    for h in range(OPEN_TIME, CLOSE_TIME):
        for m in range(0, 60, SLOT_MINUTES):
            out.append(f"{_pad(h)}:{_pad(m)}")
    return out

def _overlap_q(q, start, end):
    return q.filter(
        models.Appointment.start_time < end,
        models.Appointment.end_time > start
    )

@router.get("/specialties")
def public_list_specialties(db: Session = Depends(get_db)):
    """
    Return unique specialty/category values from services.category and users.profession (role=staff).
    Used to populate the first dropdown on booking.html.
    """
    svc_rows = (
        db.query(func.lower(models.Service.category))
        .filter(models.Service.category.isnot(None))
        .distinct()
        .all()
    )
    staff_rows = (
        db.query(func.lower(models.User.profession))
        .filter(models.User.role == "staff")
        .filter(models.User.profession.isnot(None))
        .distinct()
        .all()
    )
    vals = {r[0] for r in svc_rows if r[0]} | {r[0] for r in staff_rows if r[0]}
    out = sorted(vals)
    return [{"slug": v, "label": v.capitalize()} for v in out]

@router.get("/staff")
def public_list_staff(
    category: Optional[str] = Query(None, description="Filter by profession/category slug, e.g. 'hair'"),
    db: Session = Depends(get_db),
):
    """
    List bookable staff (id, name, profession, avatar_url). If no category is given, return an empty list.
    """
    # Hide staff until a specialty is chosen
    if not category or not category.strip():
        return []

    slug = category.strip().lower()
    q = (
        db.query(models.User)
        .filter(models.User.role == "staff")
        .filter(func.lower(models.User.profession) == slug)
    )

    staff = q.order_by(models.User.name.asc()).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "profession": (u.profession or None),
            "avatar_url": (u.avatar_url or None),
        }
        for u in staff
    ]

@router.get("/services")
def public_list_services(
    category: Optional[str] = Query(None, description="Filter by service.category slug, e.g. 'hair'"),
    db: Session = Depends(get_db),
):
    """
    List services (id, name, duration, price, category). If no category is given, return an empty list.
    """
    # Hide services until a specialty is chosen
    if not category or not category.strip():
        return []

    slug = category.strip().lower()
    q = db.query(models.Service).filter(func.lower(models.Service.category) == slug)

    svcs = q.order_by(models.Service.name.asc()).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "duration_minutes": int(s.duration_minutes),
            "price": float(s.price or 0),
            "category": (s.category or None),
        }
        for s in svcs
    ]

@router.get("/availability")
def public_availability(
    staff_id: int = Query(...),
    date: str = Query(..., description="YYYY-MM-DD"),
    service_id: int = Query(..., description="Service to compute fit"),
    db: Session = Depends(get_db),
):
    staff = db.query(models.User).filter(
        models.User.id == staff_id,
        models.User.role == "staff"
    ).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    svc = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    try:
        y, m, d = map(int, date.split("-"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")

    day_start = datetime(y, m, d, 0, 0, 0)
    day_end   = datetime(y, m, d, 23, 59, 59)
    close_dt  = datetime(y, m, d, CLOSE_TIME, 0, 0)

    appts = (
        db.query(models.Appointment)
        .filter(models.Appointment.staff_id == staff_id)
        .filter(models.Appointment.start_time < day_end)
        .filter(models.Appointment.end_time > day_start)
        .all()
    )
    busy_ranges = [(a.start_time, a.end_time) for a in appts]

    available: List[str] = []
    for hhmm in _slots_in_day():
        hh, mm = map(int, hhmm.split(":"))
        start = datetime(y, m, d, hh, mm, 0)
        end   = start + timedelta(minutes=int(svc.duration_minutes))
        if end > close_dt:
            continue
        overlaps = any((start < be and end > bs) for (bs, be) in busy_ranges)
        if not overlaps:
            available.append(hhmm)

    booked_blocks = [
        {"start": f"{_pad(bs.hour)}:{_pad(bs.minute)}",
         "end":   f"{_pad(be.hour)}:{_pad(be.minute)}"}
        for (bs, be) in busy_ranges
    ]

    return {
        "staff_id": staff_id,
        "date": date,
        "service_id": service_id,
        "available": available,
        "booked": booked_blocks,
    }

@router.post("/appointments")
def public_book_appointment(
    db: Session = Depends(get_db),
    staff_id: int = Query(...),
    date: str = Query(..., description="YYYY-MM-DD"),
    time: str = Query(..., description="HH:MM"),
    service_id: int = Query(...),
    client_first_name: str = Query(...),
    client_last_name: str = Query(...),
    client_phone: Optional[str] = Query(None),
    client_email: Optional[str] = Query(None),
    notes: Optional[str] = Query(None),
):
    staff = db.query(models.User).filter(
        models.User.id == staff_id,
        models.User.role == "staff"
    ).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    svc = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    try:
        y, m, d = map(int, date.split("-"))
        hh, mm = map(int, time.split(":"))
        start_dt = datetime(y, m, d, hh, mm, 0)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date or time")

    end_dt = start_dt + timedelta(minutes=int(svc.duration_minutes))
    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    if not (OPEN_TIME <= start_dt.hour < CLOSE_TIME):
        raise HTTPException(status_code=400, detail="Outside business hours")

    client = None
    if client_email:
        client = db.query(models.Client).filter(models.Client.email == client_email).first()
    if not client and client_phone:
        client = db.query(models.Client).filter(models.Client.phone == client_phone).first()
    if not client:
        client = models.Client(
            first_name=client_first_name.strip(),
            last_name=client_last_name.strip(),
            phone=(client_phone or None),
            email=(client_email or None),
        )
        db.add(client)
        db.flush()

    conflict = _overlap_q(
        db.query(models.Appointment).filter(models.Appointment.staff_id == staff_id),
        start_dt, end_dt
    ).first()
    if conflict:
        s = f"{_pad(conflict.start_time.hour)}:{_pad(conflict.start_time.minute)}"
        e = f"{_pad(conflict.end_time.hour)}:{_pad(conflict.end_time.minute)}"
        raise HTTPException(status_code=409, detail=f"Time unavailable {s}–{e}")

    appt = models.Appointment(
        client_id=client.id,
        staff_id=staff_id,
        service_name=svc.name,
        start_time=start_dt,
        end_time=end_dt,
        price=float(svc.price or 0.0),
        tip=0.0,
        notes=notes or "",
    )
    if hasattr(models.Appointment, "service_id"):
        appt.service_id = svc.id

    db.add(appt)
    db.commit()
    db.refresh(appt)

    return {
        "ok": True,
        "appointment_id": appt.id,
        "client_id": client.id,
        "service": {
            "id": svc.id,
            "name": svc.name,
            "duration_minutes": int(svc.duration_minutes),
            "price": float(svc.price or 0),
            "category": (svc.category or None),
        },
        "start_time": appt.start_time.isoformat(),
        "end_time": appt.end_time.isoformat(),
    }