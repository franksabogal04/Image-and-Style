# backend/app/routers/public.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional, Dict
import secrets

from ..database import get_db
from .. import models, schemas

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


def _release_expired_pending_deposits(
    db: Session,
):
    """
    Release online appointment holds whose 15-minute
    deposit window has expired.

    This protects availability even if Stripe's expired
    checkout webhook is delayed or never arrives.
    """

    now = datetime.now()

    expired = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.booking_status
            == "pending_deposit",
            models.Appointment.deposit_expires_at
            .isnot(None),
            models.Appointment.deposit_expires_at
            <= now,
        )
        .all()
    )


    if not expired:
        return


    for appointment in expired:
        appointment.booking_status = (
            "cancelled"
        )

        appointment.deposit_expires_at = (
            None
        )


    db.commit()

def _release_expired_booking_groups(
    db: Session,
):
    """
    Cancel every appointment in an expired grouped booking.
    """

    now = datetime.now()

    expired_groups = (
        db.query(
            models.BookingGroup
        )
        .filter(
            models.BookingGroup.booking_status
            == "pending_deposit",

            models.BookingGroup.deposit_expires_at
            .isnot(None),

            models.BookingGroup.deposit_expires_at
            <= now,
        )
        .all()
    )


    if not expired_groups:
        return


    for booking_group in expired_groups:
        booking_group.booking_status = (
            "cancelled"
        )

        booking_group.deposit_expires_at = (
            None
        )


        for group_item in booking_group.items:
            appointment = (
                group_item.appointment
            )

            if (
                appointment
                and appointment.booking_status
                == "pending_deposit"
            ):
                appointment.booking_status = (
                    "cancelled"
                )

                appointment.deposit_expires_at = (
                    None
                )


    db.commit()



def _nice_label(slug: str) -> str:
    """Human label from a slug."""
    if not slug:
        return ""
    return slug.replace("-", " ").strip().title()

def _normalize_email(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    value = value.strip().lower()

    return value or None


def _normalize_phone(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    digits = "".join(
        char
        for char in value
        if char.isdigit()
    )

    return digits or None

    

@router.get("/specialties")
def public_list_specialties(db: Session = Depends(get_db)):
    """
    Return unique specialty/category values from:
      - specialties table (authoritative labels),
      - services.category,
      - users.profession (role=staff).

    Used to populate the first dropdown on booking.html and the owner Services screen.
    """
    # 1) From specialties table (preferred source for labels)
    specs = db.query(models.Specialty).order_by(models.Specialty.slug.asc()).all()
    by_slug: Dict[str, str] = { (s.slug or "").strip().lower(): (s.label or _nice_label(s.slug or "")) for s in specs if s.slug }

    # 2) Distinct from services.category
    svc_rows = (
        db.query(func.lower(models.Service.category))
        .filter(models.Service.category.isnot(None))
        .distinct()
        .all()
    )
    for (slug,) in svc_rows:
        if slug:
            slug = slug.strip().lower()
            by_slug.setdefault(slug, _nice_label(slug))

    # 3) Distinct from users.profession (staff)
    staff_rows = (
        db.query(func.lower(models.User.profession))
        .filter(models.User.role == "staff")
        .filter(models.User.profession.isnot(None))
        .distinct()
        .all()
    )
    for (slug,) in staff_rows:
        if slug:
            slug = slug.strip().lower()
            by_slug.setdefault(slug, _nice_label(slug))

    # Sort by label for a nicer UI
    out = [{"slug": s, "label": by_slug[s]} for s in by_slug.keys()]
    out.sort(key=lambda x: x["label"].lower())
    return out

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

@router.get("/products")
def public_list_products(
    db: Session = Depends(get_db),
):
    products = (
        db.query(models.Product)
        .filter(
            models.Product.active == True
        )
        .order_by(
            models.Product.name.asc()
        )
        .all()
    )

    return [
        {
            "id": product.id,
            "name": product.name,
            "price": float(
                product.price or 0
            ),
            "description":
                product.description,
            "image_url":
                product.image_url,
            "active":
                bool(product.active),
        }
        for product in products
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

    _release_expired_pending_deposits(
        db
    )


    appts = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.staff_id
            == staff_id
        )
        .filter(
            models.Appointment.start_time
            < day_end
        )
        .filter(
            models.Appointment.end_time
            > day_start
        )
        .filter(
            models.Appointment.booking_status
            .notin_(
                (
                    "cancelled",
                    "late_cancelled",
                )
            )
        )
        .all()
    )
    busy_ranges = [(a.start_time, a.end_time) for a in appts]

    current_time = datetime.now()

    available: List[str] = []
    for hhmm in _slots_in_day():
        hh, mm = map(int, hhmm.split(":"))
        start = datetime(y, m, d, hh, mm, 0)
        end   = start + timedelta(minutes=int(svc.duration_minutes))

        if start <= current_time:
            continue

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

@router.get("/booking-status")
def public_booking_status(
    appointment_id: int = Query(...),
    booking_token: str = Query(...),
    db: Session = Depends(get_db),
):
    appointment = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.id
            == appointment_id
        )
        .first()
    )


    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Booking not found.",
        )


    if (
        not appointment.booking_token
        or appointment.booking_token
        != booking_token
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid booking token.",
        )


    staff = (
        db.query(models.User)
        .filter(
            models.User.id
            == appointment.staff_id
        )
        .first()
    )


    client = (
        db.query(models.Client)
        .filter(
            models.Client.id
            == appointment.client_id
        )
        .first()
    )


    paid_total = (
        db.query(models.Payment)
        .filter(
            models.Payment.appointment_id
            == appointment.id,
            models.Payment.status
            == "paid",
        )
        .all()
    )


    total_paid = round(
        sum(
            float(
                payment.amount
                or 0.0
            )
            for payment in paid_total
        ),
        2,
    )


    service_price = round(
        float(
            appointment.price
            or 0.0
        ),
        2,
    )


    remaining_balance = round(
        max(
            0.0,
            service_price
            - total_paid,
        ),
        2,
    )


    return {
        "appointment_id":
            appointment.id,

        "booking_status":
            appointment.booking_status,

        "booking_source":
            appointment.booking_source,

        "deposit_required":
            bool(
                appointment.deposit_required
            ),

        "deposit_amount":
            round(
                float(
                    appointment.deposit_amount
                    or 0.0
                ),
                2,
            ),

        "paid_total":
            total_paid,

        "remaining_balance":
            remaining_balance,

        "service_name":
            appointment.service_name,

        "service_price":
            service_price,

        "staff_name":
            (
                staff.name
                if staff
                else None
            ),

        "client_name":
            (
                (
                    f"{client.first_name} "
                    f"{client.last_name}"
                ).strip()
                if client
                else None
            ),

        "start_time":
            (
                appointment.start_time.isoformat()
                if appointment.start_time
                else None
            ),

        "end_time":
            (
                appointment.end_time.isoformat()
                if appointment.end_time
                else None
            ),
    }



@router.get(
    "/booking-group-status"
)
def public_booking_group_status(
    booking_group_id: int = Query(...),
    booking_token: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Public status used after a grouped Stripe checkout.
    """

    _release_expired_booking_groups(
        db
    )


    booking_group = (
        db.query(
            models.BookingGroup
        )
        .filter(
            models.BookingGroup.id
            == booking_group_id
        )
        .first()
    )


    if not booking_group:
        raise HTTPException(
            status_code=404,
            detail="Grouped booking not found.",
        )


    if (
        not booking_group.booking_token
        or not booking_token
        or booking_group.booking_token
        != booking_token
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid booking token.",
        )


    appointment_rows = []


    for group_item in booking_group.items:
        appointment = (
            group_item.appointment
        )

        payment = (
            group_item.payment
        )


        if not appointment:
            continue


        appointment_rows.append(
            {
                "appointment_id":
                    appointment.id,

                "staff_id":
                    appointment.staff_id,

                "service_id":
                    appointment.service_id,

                "service_name":
                    appointment.service_name,

                "start_time":
                    appointment
                    .start_time
                    .isoformat(),

                "end_time":
                    appointment
                    .end_time
                    .isoformat(),

                "service_price":
                    round(
                        float(
                            group_item
                            .service_price
                            or 0.0
                        ),
                        2,
                    ),

                "deposit_amount":
                    round(
                        float(
                            group_item
                            .deposit_amount
                            or 0.0
                        ),
                        2,
                    ),

                "booking_status":
                    appointment
                    .booking_status,

                "payment_status":
                    (
                        payment.status
                        if payment
                        else "unpaid"
                    ),
            }
        )


    return {
        "ok":
            True,

        "booking_group_id":
            booking_group.id,

        "booking_status":
            booking_group.booking_status,

        "deposit_required":
            bool(
                booking_group.deposit_required
            ),

        "total_service_amount":
            round(
                float(
                    booking_group
                    .total_service_amount
                    or 0.0
                ),
                2,
            ),

        "deposit_amount":
            round(
                float(
                    booking_group
                    .deposit_amount
                    or 0.0
                ),
                2,
            ),

        "deposit_expires_at":
            (
                booking_group
                .deposit_expires_at
                .isoformat()
                if booking_group
                .deposit_expires_at
                else None
            ),

        "appointments":
            appointment_rows,
    }


@router.post(
    "/appointments/group"
)
def public_book_grouped_appointments(
    grouped:
        schemas.PublicGroupedAppointmentCreate,

    db: Session = Depends(
        get_db
    ),
):
    """
    Create multiple simultaneous public appointments.

    Every selected service is assigned to its own available
    professional. All appointments share one customer,
    one start time, and one combined deposit checkout.
    """

    requested_items = list(
        grouped.appointments
        or []
    )


    if len(requested_items) < 2:
        raise HTTPException(
            status_code=400,
            detail=(
                "A grouped booking requires at "
                "least two services."
            ),
        )


    first_name = (
        grouped.client_first_name
        or ""
    ).strip()

    last_name = (
        grouped.client_last_name
        or ""
    ).strip()


    if not first_name or not last_name:
        raise HTTPException(
            status_code=400,
            detail=(
                "First and last name are required."
            ),
        )


    normalized_email = _normalize_email(
        grouped.client_email
    )

    normalized_phone = _normalize_phone(
        grouped.client_phone
    )


    if not (
        normalized_email
        or normalized_phone
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "A phone number or email address "
                "is required."
            ),
        )


    _release_expired_pending_deposits(
        db
    )

    _release_expired_booking_groups(
        db
    )


    validated_items = []
    shared_start = None
    assigned_staff_ids = []


    for position, requested in enumerate(
        requested_items
    ):
        staff = (
            db.query(
                models.User
            )
            .filter(
                models.User.id
                == requested.staff_id,

                models.User.role
                == "staff",
            )
            .first()
        )


        if not staff:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Professional "
                    f"#{requested.staff_id} "
                    f"was not found."
                ),
            )


        service = (
            db.query(
                models.Service
            )
            .filter(
                models.Service.id
                == requested.service_id
            )
            .first()
        )


        if not service:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Service "
                    f"#{requested.service_id} "
                    f"was not found."
                ),
            )


        if (
            staff.profession
            and service.category
            and staff.profession
            .strip()
            .lower()
            != service.category
            .strip()
            .lower()
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"{staff.name} is not assigned "
                    f"to the {service.category} "
                    f"specialty."
                ),
            )


        try:
            year, month, day = map(
                int,
                requested.date.split("-"),
            )

            hour, minute = map(
                int,
                requested.time.split(":"),
            )

            start_dt = datetime(
                year,
                month,
                day,
                hour,
                minute,
                0,
            )

        except Exception:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid date or time. Use "
                    "YYYY-MM-DD and HH:MM."
                ),
            )


        end_dt = (
            start_dt
            + timedelta(
                minutes=int(
                    service.duration_minutes
                )
            )
        )


        if end_dt <= start_dt:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Appointment end time must "
                    "be after its start time."
                ),
            )


        closing_time = datetime(
            year,
            month,
            day,
            CLOSE_TIME,
            0,
            0,
        )


        if (
            start_dt.hour < OPEN_TIME
            or start_dt >= closing_time
            or end_dt > closing_time
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"{service.name} falls outside "
                    "business hours."
                ),
            )


        if shared_start is None:
            shared_start = (
                start_dt
            )

        elif start_dt != shared_start:
            raise HTTPException(
                status_code=400,
                detail=(
                    "All services in a grouped "
                    "booking must start at the "
                    "same time."
                ),
            )


        if staff.id in assigned_staff_ids:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The same professional cannot "
                    "perform two services at the "
                    "same time."
                ),
            )


        assigned_staff_ids.append(
            staff.id
        )


        conflict_query = (
            db.query(
                models.Appointment
            )
            .filter(
                models.Appointment.staff_id
                == staff.id
            )
            .filter(
                models.Appointment.booking_status
                .notin_(
                    (
                        "cancelled",
                        "late_cancelled",
                    )
                )
            )
        )


        conflict = _overlap_q(
            conflict_query,
            start_dt,
            end_dt,
        ).first()


        if conflict:
            start_label = (
                f"{_pad(conflict.start_time.hour)}:"
                f"{_pad(conflict.start_time.minute)}"
            )

            end_label = (
                f"{_pad(conflict.end_time.hour)}:"
                f"{_pad(conflict.end_time.minute)}"
            )

            raise HTTPException(
                status_code=409,
                detail=(
                    f"{staff.name} is unavailable "
                    f"{start_label}–{end_label}."
                ),
            )


        service_price = round(
            float(
                service.price
                or 0.0
            ),
            2,
        )


        if service_price <= 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"{service.name} must have "
                    "a price greater than zero."
                ),
            )


        deposit_amount = round(
            service_price * 0.25,
            2,
        )


        validated_items.append(
            {
                "position":
                    position,

                "requested":
                    requested,

                "staff":
                    staff,

                "service":
                    service,

                "start_time":
                    start_dt,

                "end_time":
                    end_dt,

                "service_price":
                    service_price,

                "deposit_amount":
                    deposit_amount,
            }
        )


    client = None


    if normalized_email:
        client = (
            db.query(
                models.Client
            )
            .filter(
                func.lower(
                    models.Client.email
                )
                == normalized_email
            )
            .first()
        )


    if (
        not client
        and normalized_phone
    ):
        client = (
            db.query(
                models.Client
            )
            .filter(
                models.Client.phone
                == normalized_phone
            )
            .first()
        )


    if not client:
        client = models.Client(
            first_name=
                first_name,

            last_name=
                last_name,

            phone=
                normalized_phone,

            email=
                normalized_email,
        )

        db.add(
            client
        )

        db.flush()

    else:
        if (
            not client.phone
            and normalized_phone
        ):
            client.phone = (
                normalized_phone
            )

        if (
            not client.email
            and normalized_email
        ):
            client.email = (
                normalized_email
            )

        db.flush()


    total_service_amount = round(
        sum(
            item["service_price"]
            for item in validated_items
        ),
        2,
    )


    total_deposit_amount = round(
        sum(
            item["deposit_amount"]
            for item in validated_items
        ),
        2,
    )


    booking_token = (
        secrets.token_urlsafe(32)
    )

    expires_at = (
        datetime.now()
        + timedelta(
            minutes=15
        )
    )


    booking_group = models.BookingGroup(
        client_id=
            client.id,

        booking_source=
            "online",

        booking_status=
            "pending_deposit",

        booking_token=
            booking_token,

        deposit_required=
            True,

        total_service_amount=
            total_service_amount,

        deposit_amount=
            total_deposit_amount,

        deposit_expires_at=
            expires_at,
    )


    created_appointments = []


    try:
        db.add(
            booking_group
        )

        db.flush()


        for item in validated_items:
            requested = item[
                "requested"
            ]

            appointment = models.Appointment(
                client_id=
                    client.id,

                staff_id=
                    item["staff"].id,

                service_id=
                    item["service"].id,

                service_name=
                    item["service"].name,

                start_time=
                    item["start_time"],

                end_time=
                    item["end_time"],

                notes=
                    (
                        requested.notes
                        or grouped.notes
                        or ""
                    ),

                price=
                    item["service_price"],

                tip=
                    0.0,

                booking_source=
                    "online",

                booking_status=
                    "pending_deposit",

                booking_token=
                    secrets.token_urlsafe(
                        32
                    ),

                deposit_required=
                    True,

                deposit_amount=
                    item["deposit_amount"],

                deposit_expires_at=
                    expires_at,
            )


            db.add(
                appointment
            )

            db.flush()


            group_item = models.BookingGroupItem(
                booking_group_id=
                    booking_group.id,

                appointment_id=
                    appointment.id,

                position=
                    item["position"],

                service_price=
                    item["service_price"],

                deposit_amount=
                    item["deposit_amount"],
            )


            db.add(
                group_item
            )


            created_appointments.append(
                appointment
            )


        db.commit()

        db.refresh(
            booking_group
        )


        for appointment in (
            created_appointments
        ):
            db.refresh(
                appointment
            )


    except Exception:
        db.rollback()
        raise


    return {
        "ok":
            True,

        "booking_group_id":
            booking_group.id,

        "client_id":
            client.id,

        "booking_status":
            booking_group.booking_status,

        "booking_token":
            booking_group.booking_token,

        "total_service_amount":
            round(
                float(
                    booking_group
                    .total_service_amount
                    or 0.0
                ),
                2,
            ),

        "deposit_required":
            True,

        "deposit_amount":
            round(
                float(
                    booking_group
                    .deposit_amount
                    or 0.0
                ),
                2,
            ),

        "deposit_expires_at":
            (
                booking_group
                .deposit_expires_at
                .isoformat()
                if booking_group
                .deposit_expires_at
                else None
            ),

        "appointments": [
            {
                "appointment_id":
                    appointment.id,

                "staff_id":
                    appointment.staff_id,

                "service_id":
                    appointment.service_id,

                "service_name":
                    appointment.service_name,

                "start_time":
                    appointment
                    .start_time
                    .isoformat(),

                "end_time":
                    appointment
                    .end_time
                    .isoformat(),

                "service_price":
                    round(
                        float(
                            appointment.price
                            or 0.0
                        ),
                        2,
                    ),

                "deposit_amount":
                    round(
                        float(
                            appointment
                            .deposit_amount
                            or 0.0
                        ),
                        2,
                    ),
            }
            for appointment in (
                created_appointments
            )
        ],
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

    first_name = client_first_name.strip()
    last_name = client_last_name.strip()

    normalized_email = _normalize_email(
        client_email
    )

    normalized_phone = _normalize_phone(
        client_phone
    )

    if not first_name or not last_name:
        raise HTTPException(
            status_code=400,
            detail="First and last name are required",
        )

    client = None


    # Try email first
    if normalized_email:
        client = (
            db.query(models.Client)
            .filter(
                func.lower(
                    models.Client.email
                )
                == normalized_email
            )
            .first()
        )


    # Then try phone
    if (
        not client
        and normalized_phone
    ):
        client = (
            db.query(models.Client)
            .filter(
                models.Client.phone
                == normalized_phone
            )
            .first()
        )


    # Create a brand-new client
    if not client:
        client = models.Client(
            first_name=first_name,
            last_name=last_name,
            phone=normalized_phone,
            email=normalized_email,
        )

        db.add(client)
        db.flush()


    # Existing client:
    # fill in information they may not have had before.
    else:
        changed = False

        if (
            not client.phone
            and normalized_phone
        ):
            client.phone = normalized_phone
            changed = True

        if (
            not client.email
            and normalized_email
        ):
            client.email = normalized_email
            changed = True

        if changed:
            db.flush()

    _release_expired_pending_deposits(
        db
    )


    conflict_query = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.staff_id
            == staff_id
        )
        .filter(
            models.Appointment.booking_status
            .notin_(
                (
                    "cancelled",
                    "late_cancelled",
                )
            )
        )
    )


    conflict = _overlap_q(
        conflict_query,
        start_dt,
        end_dt,
    ).first()
    if conflict:
        s = f"{_pad(conflict.start_time.hour)}:{_pad(conflict.start_time.minute)}"
        e = f"{_pad(conflict.end_time.hour)}:{_pad(conflict.end_time.minute)}"
        raise HTTPException(status_code=409, detail=f"Time unavailable {s}–{e}")

    service_price = round(
        float(
            svc.price
            or 0.0
        ),
        2,
    )


    # Public website bookings require a 25% deposit.
    deposit_amount = round(
        service_price * 0.25,
        2,
    )


    # Secret token for this customer's booking.
    booking_token = (
        secrets.token_urlsafe(32)
    )


    # Hold the selected time for 15 minutes while
    # the customer completes Stripe Checkout.
    deposit_expires_at = (
        datetime.now()
        + timedelta(minutes=15)
    )


    appt = models.Appointment(
        client_id=client.id,
        staff_id=staff_id,
        service_name=svc.name,
        start_time=start_dt,
        end_time=end_dt,
        price=service_price,
        tip=0.0,
        notes=notes or "",

        booking_source="online",
        booking_status="pending_deposit",
        booking_token=booking_token,

        deposit_required=True,
        deposit_amount=deposit_amount,
        deposit_expires_at=deposit_expires_at,
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

        "booking_status":
            appt.booking_status,

        "booking_token":
            appt.booking_token,

        "deposit_required":
            bool(
                appt.deposit_required
            ),

        "deposit_amount":
            round(
                float(
                    appt.deposit_amount
                    or 0.0
                ),
                2,
            ),

        "deposit_expires_at":
            (
                appt.deposit_expires_at.isoformat()
                if appt.deposit_expires_at
                else None
            ),
    }