# backend/app/routers/earnings.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from sqlalchemy import func
from ..database import get_db
from .. import models, schemas, deps

router = APIRouter()

def _sum_or_zero(query, column):
    return float(query.with_entities(func.coalesce(func.sum(column), 0.0)).scalar() or 0.0)

@router.get("/", response_model=schemas.EarningsSummary)
def earnings(
    start: datetime = Query(None),
    end: datetime = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """
    - Staff: returns ONLY their own totals.
    - Owner & Receptionist: returns totals across everyone.

    NOTE: Sales totals are computed ONLY from sales that are linked to an appointment,
    and that appointment falls within the given date range. Orphaned sales (no appointment)
    are excluded from totals to prevent stale earnings after deleting appointments.
    """
    # Base appointment query (role + date scoped)
    q_appt = db.query(models.Appointment)
    if current_user.role == "staff":
        q_appt = q_appt.filter(models.Appointment.staff_id == current_user.id)
    elif current_user.role not in ("owner", "receptionist"):
        raise HTTPException(status_code=403, detail="Forbidden")

    if start:
        q_appt = q_appt.filter(models.Appointment.start_time >= start)
    if end:
        q_appt = q_appt.filter(models.Appointment.end_time <= end)

    services_total = _sum_or_zero(q_appt, models.Appointment.price)
    tips_total     = _sum_or_zero(q_appt, models.Appointment.tip)

    # Sales: JOIN to appointments so only sales tied to an in-range appointment are counted
    sales_q = db.query(func.coalesce(func.sum(models.Sale.total_price), 0.0)) \
        .join(models.Appointment, models.Sale.appointment_id == models.Appointment.id)

    if current_user.role == "staff":
        sales_q = sales_q.filter(models.Appointment.staff_id == current_user.id)
    # Date range based on the appointment window (not Sale.created_at)
    if start:
        sales_q = sales_q.filter(models.Appointment.start_time >= start)
    if end:
        sales_q = sales_q.filter(models.Appointment.end_time <= end)

    sales_total = float(sales_q.scalar() or 0.0)

    return schemas.EarningsSummary(
        services_total=services_total,
        tips_total=tips_total,
        sales_total=sales_total,
        grand_total=float(services_total + tips_total + sales_total),
    )

@router.get("/by-staff")
def earnings_by_staff(
    start: datetime = Query(None),
    end: datetime = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """
    Owner & Receptionist only:
    Returns:
      {
        "staff": [
          {"staff_id": 2, "staff_name": "Jane", "services_total": ..., "tips_total": ..., "sales_total": ..., "grand_total": ...},
          ...
        ],
        "totals": { "services_total": ..., "tips_total": ..., "sales_total": ..., "grand_total": ... }
      }

    NOTE: Sales are joined to appointments and grouped by the appointment's staff.
    Orphaned sales (no appointment) are excluded.
    """
    if current_user.role not in ("owner", "receptionist"):
        raise HTTPException(status_code=403, detail="Forbidden")

    # Overall appointment totals (date-scoped)
    q_appt = db.query(models.Appointment)
    if start:
        q_appt = q_appt.filter(models.Appointment.start_time >= start)
    if end:
        q_appt = q_appt.filter(models.Appointment.end_time <= end)

    services_total = _sum_or_zero(q_appt, models.Appointment.price)
    tips_total     = _sum_or_zero(q_appt, models.Appointment.tip)

    # Overall sales: join to appointments for range + dedupe orphans
    sales_total_q = db.query(func.coalesce(func.sum(models.Sale.total_price), 0.0)) \
        .join(models.Appointment, models.Sale.appointment_id == models.Appointment.id)
    if start:
        sales_total_q = sales_total_q.filter(models.Appointment.start_time >= start)
    if end:
        sales_total_q = sales_total_q.filter(models.Appointment.end_time <= end)
    sales_total = float(sales_total_q.scalar() or 0.0)

    totals = {
        "services_total": services_total,
        "tips_total": tips_total,
        "sales_total": sales_total,
        "grand_total": float(services_total + tips_total + sales_total),
    }

    # Per-staff services/tips
    appt_rows = db.query(
        models.Appointment.staff_id,
        func.coalesce(func.sum(models.Appointment.price), 0.0),
        func.coalesce(func.sum(models.Appointment.tip), 0.0),
    )
    if start:
        appt_rows = appt_rows.filter(models.Appointment.start_time >= start)
    if end:
        appt_rows = appt_rows.filter(models.Appointment.end_time <= end)
    appt_rows = appt_rows.group_by(models.Appointment.staff_id).all()

    # Per-staff sales: group by Appointment.staff_id via join
    sales_rows = db.query(
        models.Appointment.staff_id,
        func.coalesce(func.sum(models.Sale.total_price), 0.0),
    ).join(models.Sale, models.Sale.appointment_id == models.Appointment.id)
    if start:
        sales_rows = sales_rows.filter(models.Appointment.start_time >= start)
    if end:
        sales_rows = sales_rows.filter(models.Appointment.end_time <= end)
    sales_rows = sales_rows.group_by(models.Appointment.staff_id).all()

    appt_map = {sid: {"services_total": float(s or 0.0), "tips_total": float(t or 0.0)} for sid, s, t in appt_rows}
    for sid, sales_sum in sales_rows:
        appt_map.setdefault(sid, {"services_total": 0.0, "tips_total": 0.0})
        appt_map[sid]["sales_total"] = float(sales_sum or 0.0)

    # Build the response in staff name order
    staff_ids = list(appt_map.keys())
    users = db.query(models.User).filter(models.User.id.in_(staff_ids)).all()
    name_by_id = {u.id: u.name for u in users}

    out = []
    for sid in sorted(staff_ids, key=lambda x: name_by_id.get(x, "")):
        serv = appt_map[sid].get("services_total", 0.0)
        tips = appt_map[sid].get("tips_total", 0.0)
        sales = appt_map[sid].get("sales_total", 0.0)
        out.append({
            "staff_id": sid,
            "staff_name": name_by_id.get(sid, f"Staff #{sid}"),
            "services_total": serv,
            "tips_total": tips,
            "sales_total": sales,
            "grand_total": float(serv + tips + sales),
        })

    return {"staff": out, "totals": totals}