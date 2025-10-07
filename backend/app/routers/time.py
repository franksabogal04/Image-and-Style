# app/routers/time.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List

from ..database import get_db
from .. import models, schemas, deps

router = APIRouter()

def _get_open_entry(db: Session, user_id: int) -> Optional[models.TimeEntry]:
    return (
        db.query(models.TimeEntry)
        .filter(models.TimeEntry.user_id == user_id, models.TimeEntry.clock_out.is_(None))
        .order_by(models.TimeEntry.clock_in.desc())
        .first()
    )

def _get_open_break(db: Session, entry_id: int) -> Optional[models.BreakEntry]:
    return (
        db.query(models.BreakEntry)
        .filter(models.BreakEntry.time_entry_id == entry_id, models.BreakEntry.end.is_(None))
        .order_by(models.BreakEntry.start.desc())
        .first()
    )

@router.post("/clock-in", response_model=schemas.TimeEntryOut)
def clock_in(
    when: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    # prevent overlapping open entries
    open_entry = _get_open_entry(db, current_user.id)
    if open_entry:
        raise HTTPException(status_code=400, detail="You already have an open shift.")

    entry = models.TimeEntry(user_id=current_user.id, clock_in=when or datetime.utcnow())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

@router.post("/clock-out", response_model=schemas.TimeEntryOut)
def clock_out(
    when: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    entry = _get_open_entry(db, current_user.id)
    if not entry:
        raise HTTPException(status_code=400, detail="No open shift to clock out.")

    # cannot clock out while break is open
    b = _get_open_break(db, entry.id)
    if b:
        raise HTTPException(status_code=400, detail="End your break before clocking out.")

    entry.clock_out = when or datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return entry

@router.post("/break/start", response_model=schemas.TimeEntryOut)
def break_start(
    when: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    entry = _get_open_entry(db, current_user.id)
    if not entry:
        raise HTTPException(status_code=400, detail="No open shift to start a break.")
    open_br = _get_open_break(db, entry.id)
    if open_br:
        raise HTTPException(status_code=400, detail="A break is already in progress.")

    br = models.BreakEntry(time_entry_id=entry.id, start=when or datetime.utcnow())
    db.add(br)
    db.commit()
    db.refresh(entry)
    return entry

@router.post("/break/end", response_model=schemas.TimeEntryOut)
def break_end(
    when: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    entry = _get_open_entry(db, current_user.id)
    if not entry:
        raise HTTPException(status_code=400, detail="No open shift.")
    br = _get_open_break(db, entry.id)
    if not br:
        raise HTTPException(status_code=400, detail="No break in progress.")
    br.end = when or datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return entry

@router.get("/me/current", response_model=Optional[schemas.TimeEntryOut])
def me_current(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    return _get_open_entry(db, current_user.id)

@router.get("/me", response_model=schemas.TimeSummary)
def my_time_entries(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    q = db.query(models.TimeEntry).filter(models.TimeEntry.user_id == current_user.id)
    if start:
        q = q.filter(models.TimeEntry.clock_in >= start)
    if end:
        q = q.filter(
            # include entries that ended before end; for open entries, also allow
            (models.TimeEntry.clock_out <= end) | (models.TimeEntry.clock_out.is_(None))
        )
    entries: List[models.TimeEntry] = q.order_by(models.TimeEntry.clock_in.desc()).all()

    def minutes(dt1: datetime, dt2: datetime) -> int:
        return int(max(0, (dt2 - dt1).total_seconds() // 60))

    worked_total = 0
    break_total = 0

    now = datetime.utcnow()
    out_entries = []
    for e in entries:
        end_time = e.clock_out or now
        worked_total += minutes(e.clock_in, end_time)

        # sum breaks
        br_sum = 0
        for b in e.breaks:
            br_end = b.end or now
            br_sum += minutes(b.start, br_end)
        break_total += br_sum
        out_entries.append(e)

    return schemas.TimeSummary(
        worked_minutes=worked_total,
        break_minutes=break_total,
        payable_minutes=max(0, worked_total - break_total),
        entries=out_entries,
    )