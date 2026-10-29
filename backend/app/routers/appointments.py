# backend/app/routers/appointments.py

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    Path,
)
from sqlalchemy.orm import Session
from sqlalchemy import and_

from datetime import datetime, timedelta
from typing import List, Optional

from pydantic import BaseModel, Field

from ..database import get_db
from .. import models, schemas, deps
from ..email_service import (
    send_booking_confirmation_email,
)


router = APIRouter()


# =========================
# Helpers
# =========================

def _overlap_q(q, start, end):
    return q.filter(
        models.Appointment.start_time < end,
        models.Appointment.end_time > start,
    )


def _appointment_is_fully_paid(
    appointment: models.Appointment,
    db: Session,
) -> bool:
    paid_payments = (
        db.query(models.Payment)
        .filter(
            models.Payment.appointment_id
            == appointment.id,
            models.Payment.status
            == "paid",
        )
        .all()
    )

    paid_total = round(
        sum(
            float(
                payment.amount
                or 0.0
            )
            for payment in paid_payments
        ),
        2,
    )

    if paid_total <= 0:
        return False

    service_total = round(
        float(
            appointment.total_with_tax
            if appointment.total_with_tax
            is not None
            else (
                float(
                    appointment.price
                    or 0.0
                )
                + float(
                    appointment.tip
                    or 0.0
                )
                + float(
                    appointment.service_tax_amount
                    or 0.0
                )
                + float(
                    appointment.tip_tax_amount
                    or 0.0
                )
            )
        ),
        2,
    )

    sales = (
        db.query(models.Sale)
        .filter(
            models.Sale.appointment_id
            == appointment.id
        )
        .all()
    )

    product_total = round(
        sum(
            float(
                sale.total_with_tax
                if sale.total_with_tax
                is not None
                else sale.total_price
                or 0.0
            )
            for sale in sales
        ),
        2,
    )

    total_due = round(
        service_total
        + product_total,
        2,
    )

    return (
        paid_total + 0.005
        >= total_due
    )


def _pick_active_tax_rule(
    db: Session,
    when: Optional[datetime] = None,
) -> Optional[models.TaxRule]:
    when = when or datetime.utcnow()

    return (
        db.query(models.TaxRule)
        .filter(models.TaxRule.active == True)
        .filter(
            and_(
                (
                    models.TaxRule.effective_from
                    == None
                )
                |
                (
                    models.TaxRule.effective_from
                    <= when
                ),
                (
                    models.TaxRule.effective_to
                    == None
                )
                |
                (
                    models.TaxRule.effective_to
                    >= when
                ),
            )
        )
        .order_by(
            models.TaxRule
            .effective_from
            .desc()
            .nullslast()
        )
        .first()
    )


def _apply_tax_snapshot_to_appt(
    appt: models.Appointment,
    rule: Optional[models.TaxRule],
):
    price = float(appt.price or 0.0)
    tip = float(appt.tip or 0.0)

    if not rule:
        appt.tax_rule_id = None
        appt.service_tax_rate = None
        appt.tip_tax_rate = None

        appt.service_tax_amount = None
        appt.tip_tax_amount = None

        appt.total_with_tax = round(
            price + tip,
            2,
        )

        return

    appt.tax_rule_id = rule.id

    service_rate = float(
        rule.service_rate or 0.0
    )

    tip_rate = (
        service_rate
        if bool(rule.tips_taxable)
        else 0.0
    )

    service_tax = round(
        price * service_rate,
        2,
    )

    tip_tax = round(
        tip * tip_rate,
        2,
    )

    appt.service_tax_rate = service_rate
    appt.tip_tax_rate = tip_rate

    appt.service_tax_amount = service_tax
    appt.tip_tax_amount = tip_tax

    appt.total_with_tax = round(
        price
        + tip
        + service_tax
        + tip_tax,
        2,
    )


def _apply_tax_snapshot_to_sale(
    sale: models.Sale,
    rule: Optional[models.TaxRule],
):
    subtotal = float(
        sale.total_price or 0.0
    )

    if not rule:
        sale.tax_rule_id = None
        sale.retail_tax_rate = None
        sale.retail_tax_amount = None
        sale.total_with_tax = round(
            subtotal,
            2,
        )
        return

    sale.tax_rule_id = rule.id

    rate = float(
        rule.retail_rate or 0.0
    )

    tax = round(
        subtotal * rate,
        2,
    )

    sale.retail_tax_rate = rate
    sale.retail_tax_amount = tax

    sale.total_with_tax = round(
        subtotal + tax,
        2,
    )


def _validate_staff(
    staff: Optional[models.User],
):
    if not staff:
        raise HTTPException(
            status_code=400,
            detail="Invalid staff id",
        )

    if staff.role != "staff":
        raise HTTPException(
            status_code=400,
            detail=(
                "Appointments must be assigned "
                "to a staff user."
            ),
        )


def _validate_staff_service(
    staff: models.User,
    service: models.Service,
):
    """
    If both profession and category are assigned,
    they must match.

    We allow legacy staff without a profession
    so existing development data does not break.
    """

    if (
        staff.profession
        and service.category
        and staff.profession.strip().lower()
        != service.category.strip().lower()
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"{staff.name} is not assigned "
                f"to the {service.category} specialty."
            ),
        )
    
    # =========================
# SCHEDULE STAFF
# =========================

@router.get(
    "/schedule-staff",
)
def list_schedule_staff(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    if current_user.role not in (
        "owner",
        "receptionist",
        "staff",
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    staff_members = (
        db.query(models.User)
        .filter(
            models.User.role
            == "staff"
        )
        .order_by(
            models.User.name.asc()
        )
        .all()
    )

    return [
        {
            "id":
                person.id,

            "name":
                person.name,

            "profession":
                person.profession,

            "avatar_url":
                person.avatar_url,
        }
        for person in staff_members
    ]


# =========================
# CREATE
# =========================

@router.post(
    "/",
    response_model=schemas.AppointmentOut,
)
def create_appointment(
    appt: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    if appt.end_time <= appt.start_time:
        raise HTTPException(
            status_code=400,
            detail=(
                "end_time must be after start_time"
            ),
        )

    if (
        current_user.role == "staff"
        and appt.staff_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Staff can only create "
                "their own appointments"
            ),
        )

    booking_source = (
        appt.booking_source
        or "phone"
    )

    if (
        booking_source == "walk_in"
        and current_user.role not in (
            "owner",
            "receptionist",
        )
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Only an owner or receptionist "
                "can create walk-in appointments."
            ),
        )


    client = (
        db.query(models.Client)
        .filter(
            models.Client.id
            == appt.client_id
        )
        .first()
    )

    if not client:
        raise HTTPException(
            status_code=400,
            detail="Invalid client id",
        )

    staff = (
        db.query(models.User)
        .filter(
            models.User.id
            == appt.staff_id
        )
        .first()
    )

    _validate_staff(staff)

    service = (
        db.query(models.Service)
        .filter(
            models.Service.id
            == appt.service_id
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=400,
            detail="Invalid service id",
        )

    _validate_staff_service(
        staff,
        service,
    )

    # Release deposit holds that were never completed.
    now = datetime.now()

    expired_holds = (
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

    for expired in expired_holds:
        paid_deposit = (
            db.query(models.Payment)
            .filter(
                models.Payment.appointment_id
                == expired.id,
                models.Payment.status
                == "paid",
            )
            .first()
        )

        if paid_deposit:
            expired.booking_status = (
                "confirmed"
            )
        else:
            expired.booking_status = (
                "cancelled"
            )

        expired.deposit_expires_at = None

    if expired_holds:
        db.flush()

    conflict_query = (
        db.query(models.Appointment)
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
        appt.start_time,
        appt.end_time,
    ).first()

    if conflict:
        raise HTTPException(
            status_code=409,
            detail=(
                "Staff already booked "
                f"{conflict.start_time}"
                "–"
                f"{conflict.end_time}"
            ),
        )

    data = appt.model_dump()

    # Snapshot the actual Service name.
    data["service_name"] = service.name

    if data.get("price") is None:
        data["price"] = float(
            service.price or 0.0
        )

    if data.get("tip") is None:
        data["tip"] = 0.0

    service_price = round(
        float(
            data.get("price")
            or 0.0
        ),
        2,
    )

    data["booking_token"] = None

    if booking_source == "walk_in":
        data["booking_source"] = "walk_in"
        data["booking_status"] = "confirmed"

        data["deposit_required"] = False
        data["deposit_amount"] = 0.0
        data["deposit_expires_at"] = None

    else:
        deposit_amount = round(
            service_price
            * 0.25,
            2,
        )

        if deposit_amount <= 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "This service must have a price "
                    "greater than zero before a "
                    "deposit can be collected."
                ),
            )

        data["booking_source"] = "phone"
        data["booking_status"] = (
            "pending_deposit"
        )

        data["deposit_required"] = True
        data["deposit_amount"] = (
            deposit_amount
        )
        data["deposit_expires_at"] = (
            datetime.now()
            + timedelta(
                minutes=15
            )
        )

    db_appt = models.Appointment(**data)

    rule = None

    if appt.tax_rule_id:
        rule = (
            db.query(models.TaxRule)
            .filter(
                models.TaxRule.id
                == appt.tax_rule_id,
                models.TaxRule.active
                == True,
            )
            .first()
        )

        if not rule:
            raise HTTPException(
                status_code=400,
                detail="Invalid tax_rule_id",
            )

    else:
        rule = _pick_active_tax_rule(
            db,
            appt.start_time,
        )

    _apply_tax_snapshot_to_appt(
        db_appt,
        rule,
    )

    db.add(db_appt)
    db.commit()
    db.refresh(db_appt)

    if booking_source == "walk_in":
        email_result = (
            send_booking_confirmation_email(
                db,
                db_appt,
            )
        )

        if not email_result.get(
            "sent"
        ):
            print(
                "Walk-in confirmation email:",
                email_result,
            )

    return db_appt


# =========================
# CREATE GROUPED BOOKING
# =========================

@router.post(
    "/group",
)
def create_grouped_appointments(
    grouped:
        schemas.GroupedAppointmentCreate,

    db: Session = Depends(
        get_db
    ),

    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    """
    Create two or more simultaneous appointments as one
    booking.

    Every service remains a separate Appointment and receives
    its own exact 25% deposit allocation.

    Owner/receptionist:
        May assign any available staff.

    Staff:
        May include another staff member only when the group
        also contains an appointment assigned to themselves.

    Walk-ins:
        Owner/receptionist only and no deposit is required.
    """

    items = list(
        grouped.appointments
        or []
    )


    if len(items) < 2:
        raise HTTPException(
            status_code=400,
            detail=(
                "A grouped booking requires at "
                "least two services."
            ),
        )


    if current_user.role not in (
        "owner",
        "receptionist",
        "staff",
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )


    booking_source = (
        grouped.booking_source
        or "phone"
    )


    if (
        booking_source == "walk_in"
        and current_user.role not in (
            "owner",
            "receptionist",
        )
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Only an owner or receptionist "
                "can create grouped walk-ins."
            ),
        )


    assigned_staff_ids = [
        int(item.staff_id)
        for item in items
    ]


    if (
        current_user.role == "staff"
        and current_user.id
        not in assigned_staff_ids
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "A staff-created grouped booking "
                "must include that staff member's "
                "own appointment."
            ),
        )


    if (
        len(set(assigned_staff_ids))
        != len(assigned_staff_ids)
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "The same professional cannot perform "
                "two services at the same time."
            ),
        )


    shared_start = (
        items[0].start_time
    )


    for item in items:
        if (
            item.end_time
            <= item.start_time
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Every appointment end_time "
                    "must be after start_time."
                ),
            )


        if (
            item.start_time
            != shared_start
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "All services in this grouped "
                    "booking must start at the same time."
                ),
            )


    client = (
        db.query(
            models.Client
        )
        .filter(
            models.Client.id
            == grouped.client_id
        )
        .first()
    )


    if not client:
        raise HTTPException(
            status_code=400,
            detail="Invalid client id",
        )


    # Release expired appointment holds before checking
    # availability.
    now = datetime.now()

    expired_holds = (
        db.query(
            models.Appointment
        )
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


    for expired in expired_holds:
        paid_deposit = (
            db.query(
                models.Payment
            )
            .filter(
                models.Payment.appointment_id
                == expired.id,

                models.Payment.status
                == "paid",
            )
            .first()
        )

        expired.booking_status = (
            "confirmed"
            if paid_deposit
            else "cancelled"
        )

        expired.deposit_expires_at = (
            None
        )


    if expired_holds:
        db.flush()


    validated_items = []


    # Validate every service and every professional before
    # creating anything. If one fails, none are created.
    for position, item in enumerate(
        items
    ):
        staff = (
            db.query(
                models.User
            )
            .filter(
                models.User.id
                == item.staff_id
            )
            .first()
        )

        _validate_staff(
            staff
        )


        service = (
            db.query(
                models.Service
            )
            .filter(
                models.Service.id
                == item.service_id
            )
            .first()
        )


        if not service:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid service id "
                    f"{item.service_id}"
                ),
            )


        _validate_staff_service(
            staff,
            service,
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
            item.start_time,
            item.end_time,
        ).first()


        if conflict:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"{staff.name} is already booked "
                    f"{conflict.start_time}"
                    "–"
                    f"{conflict.end_time}."
                ),
            )


        service_price = round(
            float(
                item.price
                if item.price is not None
                else service.price
                or 0.0
            ),
            2,
        )


        if (
            booking_source != "walk_in"
            and service_price <= 0
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"{service.name} must have a "
                    "price greater than zero before "
                    "a deposit can be collected."
                ),
            )


        deposit_amount = (
            0.0
            if booking_source == "walk_in"
            else round(
                service_price * 0.25,
                2,
            )
        )


        rule = None

        if item.tax_rule_id:
            rule = (
                db.query(
                    models.TaxRule
                )
                .filter(
                    models.TaxRule.id
                    == item.tax_rule_id,

                    models.TaxRule.active
                    == True,
                )
                .first()
            )

            if not rule:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Invalid tax_rule_id"
                    ),
                )

        else:
            rule = _pick_active_tax_rule(
                db,
                item.start_time,
            )


        validated_items.append(
            {
                "position":
                    position,

                "request":
                    item,

                "staff":
                    staff,

                "service":
                    service,

                "service_price":
                    service_price,

                "deposit_amount":
                    deposit_amount,

                "tax_rule":
                    rule,
            }
        )


    total_service_amount = round(
        sum(
            entry["service_price"]
            for entry in validated_items
        ),
        2,
    )


    total_deposit_amount = round(
        sum(
            entry["deposit_amount"]
            for entry in validated_items
        ),
        2,
    )


    expires_at = (
        None
        if booking_source == "walk_in"
        else (
            datetime.now()
            + timedelta(
                minutes=15
            )
        )
    )


    booking_group = models.BookingGroup(
        client_id=
            client.id,

        booking_source=
            booking_source,

        booking_status=
            (
                "confirmed"
                if booking_source == "walk_in"
                else "pending_deposit"
            ),

        booking_token=
            None,

        deposit_required=
            booking_source != "walk_in",

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


        for entry in validated_items:
            item = entry[
                "request"
            ]

            service = entry[
                "service"
            ]


            appointment = (
                models.Appointment(
                    client_id=
                        client.id,

                    staff_id=
                        item.staff_id,

                    service_id=
                        service.id,

                    service_name=
                        service.name,

                    start_time=
                        item.start_time,

                    end_time=
                        item.end_time,

                    notes=
                        item.notes
                        or "",

                    price=
                        entry[
                            "service_price"
                        ],

                    tip=
                        (
                            float(
                                item.tip
                                or 0.0
                            )
                        ),

                    booking_source=
                        booking_source,

                    booking_status=
                        (
                            "confirmed"
                            if booking_source
                            == "walk_in"
                            else "pending_deposit"
                        ),

                    booking_token=
                        None,

                    deposit_required=
                        booking_source
                        != "walk_in",

                    deposit_amount=
                        entry[
                            "deposit_amount"
                        ],

                    deposit_expires_at=
                        expires_at,
                )
            )


            _apply_tax_snapshot_to_appt(
                appointment,
                entry[
                    "tax_rule"
                ],
            )


            db.add(
                appointment
            )

            db.flush()


            group_item = (
                models.BookingGroupItem(
                    booking_group_id=
                        booking_group.id,

                    appointment_id=
                        appointment.id,

                    position=
                        entry[
                            "position"
                        ],

                    service_price=
                        entry[
                            "service_price"
                        ],

                    deposit_amount=
                        entry[
                            "deposit_amount"
                        ],
                )
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


    if booking_source == "walk_in":
        for appointment in (
            created_appointments
        ):
            email_result = (
                send_booking_confirmation_email(
                    db,
                    appointment,
                )
            )

            if not email_result.get(
                "sent"
            ):
                print(
                    "Grouped walk-in confirmation email:",
                    email_result,
                )


    return {
        "ok":
            True,

        "booking_group_id":
            booking_group.id,

        "booking_source":
            booking_group.booking_source,

        "booking_status":
            booking_group.booking_status,

        "client_id":
            client.id,

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
            bool(
                booking_group.deposit_required
            ),

        "deposit_amount":
            round(
                float(
                    booking_group.deposit_amount
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




# =========================
# LIST
# =========================

@router.get(
    "/",
    response_model=List[
        schemas.AppointmentOut
    ],
)
def list_appointments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    staff_id: Optional[int] = Query(None),
    client_id: Optional[int] = Query(None),
):
    q = db.query(
        models.Appointment
    )

    # Everyone with a valid salon role can see
    # the overall appointment schedule.
    if current_user.role not in (
        "owner",
        "receptionist",
        "staff",
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    # Owner/receptionist may filter by staff.
    #
    # Regular staff still receive the full schedule
    # so they can see who is booked and when.
    if (
        current_user.role in (
            "owner",
            "receptionist",
        )
        and staff_id
    ):
        q = q.filter(
            models.Appointment.staff_id
            == staff_id
        )

    if client_id:
        q = q.filter(
            models.Appointment.client_id
            == client_id
        )

    if start:
        q = q.filter(
            models.Appointment.start_time
            >= start
        )

    if end:
        q = q.filter(
            models.Appointment.end_time
            <= end
        )

    appointments = (
        q.order_by(
            models.Appointment.start_time.asc()
        )
        .all()
    )

    if not appointments:
        return []

    appointment_ids = [
        appt.id
        for appt in appointments
    ]

    paid_rows = (
        db.query(
            models.Payment.appointment_id
        )
        .filter(
            models.Payment.appointment_id.in_(
                appointment_ids
            ),
            models.Payment.status
            == "paid",
        )
        .distinct()
        .all()
    )

    paid_ids = {
        row[0]
        for row in paid_rows
    }


    # Successful refund totals by appointment.
    refund_rows = (
        db.query(
            models.Refund.appointment_id,
            __import__("sqlalchemy").func.coalesce(
                __import__("sqlalchemy").func.sum(
                    models.Refund.amount
                ),
                0.0,
            ),
        )
        .filter(
            models.Refund.appointment_id.in_(
                appointment_ids
            ),
            models.Refund.status
            == "succeeded",
        )
        .group_by(
            models.Refund.appointment_id
        )
        .all()
    )


    refunded_by_appointment = {
        row[0]: round(
            float(
                row[1]
                or 0.0
            ),
            2,
        )
        for row in refund_rows
    }


    payment_amount_rows = (
        db.query(
            models.Payment.appointment_id,
            __import__("sqlalchemy").func.coalesce(
                __import__("sqlalchemy").func.sum(
                    models.Payment.amount
                ),
                0.0,
            ),
        )
        .filter(
            models.Payment.appointment_id.in_(
                appointment_ids
            ),
            models.Payment.status
            == "paid",
        )
        .group_by(
            models.Payment.appointment_id
        )
        .all()
    )


    paid_amount_by_appointment = {
        row[0]: round(
            float(
                row[1]
                or 0.0
            ),
            2,
        )
        for row in payment_amount_rows
    }


    product_total_rows = (
        db.query(
            models.Sale.appointment_id,

            __import__("sqlalchemy").func.coalesce(
                __import__("sqlalchemy").func.sum(
                    models.Sale.total_price
                    + models.Sale.retail_tax_amount
                ),
                0.0,
            ),
        )
        .filter(
            models.Sale.appointment_id.in_(
                appointment_ids
            )
        )
        .group_by(
            models.Sale.appointment_id
        )
        .all()
    )


    product_total_by_appointment = {
        row[0]: round(
            float(
                row[1]
                or 0.0
            ),
            2,
        )
        for row in product_total_rows
    }


    result = []

    for appt in appointments:
        data = (
            schemas.AppointmentOut
            .model_validate(appt)
            .model_dump()
        )

        paid_amount = (
            paid_amount_by_appointment.get(
                appt.id,
                0.0,
            )
        )

        refunded_amount = (
            refunded_by_appointment.get(
                appt.id,
                0.0,
            )
        )


        appointment_total = round(
            float(
                getattr(
                    appt,
                    "total_with_tax",
                    0.0,
                )
                or (
                    float(
                        appt.price
                        or 0.0
                    )
                    + float(
                        appt.tip
                        or 0.0
                    )
                    + float(
                        getattr(
                            appt,
                            "service_tax_amount",
                            0.0,
                        )
                        or 0.0
                    )
                    + float(
                        getattr(
                            appt,
                            "tip_tax_amount",
                            0.0,
                        )
                        or 0.0
                    )
                )
            ),
            2,
        )


        product_total = (
            product_total_by_appointment.get(
                appt.id,
                0.0,
            )
        )


        total_due = round(
            appointment_total
            + product_total,
            2,
        )


        if (
            paid_amount > 0
            and refunded_amount > 0
            and refunded_amount + 0.005
            >= paid_amount
        ):
            data["payment_status"] = (
                "refunded"
            )

        elif (
            paid_amount > 0
            and refunded_amount > 0
        ):
            data["payment_status"] = (
                "partially_refunded"
            )

        elif (
            paid_amount > 0
            and paid_amount + 0.005
            < total_due
        ):
            data["payment_status"] = (
                "partially_paid"
            )

        elif (
            paid_amount > 0
            and paid_amount + 0.005
            >= total_due
        ):
            data["payment_status"] = (
                "paid"
            )

        else:
            data["payment_status"] = (
                "unpaid"
            )

        # -------------------------------------------------
        # STAFF PRIVACY
        # -------------------------------------------------
        #
        # Staff may SEE everyone on the calendar,
        # but another employee's appointment must not
        # expose pricing, tips, tax amounts, totals,
        # or private notes.
        #
        # Their own appointments remain fully visible.
        # Owner/receptionist retain full access.
        # -------------------------------------------------

        is_other_staff_appointment = (
            current_user.role == "staff"
            and appt.staff_id
            != current_user.id
        )

        if is_other_staff_appointment:
            data["notes"] = None

            data["price"] = None
            data["tip"] = None

            data["tax_rule_id"] = None
            data["service_tax_rate"] = None
            data["tip_tax_rate"] = None

            data["service_tax_amount"] = None
            data["tip_tax_amount"] = None
            data["total_with_tax"] = None

        result.append(
            data
        )

    return result

# =========================
# UPDATE
# =========================

@router.put(
    "/{appointment_id}",
    response_model=schemas.AppointmentOut,
)
def update_appointment(
    appointment_id: int = Path(...),
    payload: schemas.AppointmentUpdate = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    appt = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.id
            == appointment_id
        )
        .first()
    )

    if not appt:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found",
        )

    if (
        current_user.role == "staff"
        and appt.staff_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    data = payload.model_dump(
        exclude_unset=True
    )

    if current_user.role == "staff":
        data.pop("staff_id", None)
        data.pop("client_id", None)
        data.pop("tax_rule_id", None)

    # Validate client if changed
    if "client_id" in data:
        client = (
            db.query(models.Client)
            .filter(
                models.Client.id
                == data["client_id"]
            )
            .first()
        )

        if not client:
            raise HTTPException(
                status_code=400,
                detail="Invalid client id",
            )

    target_staff_id = data.get(
        "staff_id",
        appt.staff_id,
    )

    staff = (
        db.query(models.User)
        .filter(
            models.User.id
            == target_staff_id
        )
        .first()
    )

    _validate_staff(staff)

    if (
        "service_id" in data
        and data["service_id"] is None
    ):
        raise HTTPException(
            status_code=400,
            detail="service_id cannot be null",
        )

    target_service_id = data.get(
        "service_id",
        appt.service_id,
    )

    service = None

    if target_service_id:
        service = (
            db.query(models.Service)
            .filter(
                models.Service.id
                == target_service_id
            )
            .first()
        )

        if not service:
            raise HTTPException(
                status_code=400,
                detail="Invalid service id",
            )

        _validate_staff_service(
            staff,
            service,
        )

    # When the real service changes,
    # update the snapshot name too.
    if (
        "service_id" in data
        and service
    ):
        data["service_name"] = service.name

    chosen_rule = None

    if (
        "tax_rule_id" in data
        and data["tax_rule_id"] is not None
    ):
        chosen_rule = (
            db.query(models.TaxRule)
            .filter(
                models.TaxRule.id
                == data["tax_rule_id"],
                models.TaxRule.active
                == True,
            )
            .first()
        )

        if not chosen_rule:
            raise HTTPException(
                status_code=400,
                detail="Invalid tax_rule_id",
            )

    for key, value in data.items():
        setattr(
            appt,
            key,
            value,
        )

    if appt.end_time <= appt.start_time:
        raise HTTPException(
            status_code=400,
            detail=(
                "end_time must be after start_time"
            ),
        )

    conflict = _overlap_q(
        db.query(models.Appointment)
        .filter(
            models.Appointment.staff_id
            == appt.staff_id,
            models.Appointment.id
            != appt.id,
            models.Appointment.booking_status
            .notin_(
                (
                    "cancelled",
                    "late_cancelled",
                )
            ),
        ),
        appt.start_time,
        appt.end_time,
    ).first()

    if conflict:
        raise HTTPException(
            status_code=409,
            detail=(
                "Staff already booked "
                f"{conflict.start_time}"
                "–"
                f"{conflict.end_time}"
            ),
        )

    if chosen_rule:
        rule_to_use = chosen_rule

    elif appt.tax_rule_id:
        rule_to_use = db.get(
            models.TaxRule,
            appt.tax_rule_id,
        )

    else:
        rule_to_use = _pick_active_tax_rule(
            db,
            appt.start_time,
        )

    _apply_tax_snapshot_to_appt(
        appt,
        rule_to_use,
    )

    db.commit()
    db.refresh(appt)

    return appt


# =========================
# ADD PRODUCT SALE
# =========================

class AddSalePayload(BaseModel):
    product_id: int

    quantity: int = Field(
        default=1,
        ge=1,
    )

    # Actual employee who sold the product.
    #
    # Regular staff do not need to send this;
    # they are automatically credited as seller.
    #
    # Owner/receptionist may choose the seller.
    staff_id: Optional[int] = None

    total_price: Optional[float] = None
    tax_rule_id: Optional[int] = None


def _group_appointment_for_seller(
    appointment: models.Appointment,
    seller_id: int,
    db: Session,
):
    """
    If an appointment belongs to a grouped booking and
    the selected seller has another appointment in that
    same group, attach the product to that seller's ticket.

    Otherwise keep the product on the original ticket.
    """

    group_item = (
        db.query(
            models.BookingGroupItem
        )
        .filter(
            models.BookingGroupItem.appointment_id
            == appointment.id
        )
        .first()
    )

    if not group_item:
        return appointment

    target = (
        db.query(
            models.Appointment
        )
        .join(
            models.BookingGroupItem,
            models.BookingGroupItem.appointment_id
            == models.Appointment.id,
        )
        .filter(
            models.BookingGroupItem.booking_group_id
            == group_item.booking_group_id,

            models.Appointment.staff_id
            == seller_id,

            models.Appointment.booking_status
            .notin_(
                (
                    "cancelled",
                    "late_cancelled",
                )
            ),
        )
        .first()
    )

    return (
        target
        if target
        else appointment
    )


@router.post(
    "/{appointment_id}/add_sale",
    status_code=201,
)
def add_sale_to_appointment(
    appointment_id: int,
    payload: AddSalePayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    appt = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.id
            == appointment_id
        )
        .first()
    )

    if not appt:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found",
        )

    # Do not allow products to be changed
    # after payment has been finalized.
    if _appointment_is_fully_paid(
        appt,
        db,
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Products cannot be changed "
                "after the appointment has been paid."
            ),
        )

    if (
        current_user.role == "staff"
        and appt.staff_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )
    
        # -----------------------------------------------------
    # SOLD BY
    # -----------------------------------------------------

    if current_user.role == "staff":
        # Staff can only credit product sales
        # to themselves.
        seller_id = current_user.id

    elif current_user.role in (
        "owner",
        "receptionist",
    ):
        # Owner/receptionist may select who
        # actually sold the product.
        #
        # If no seller is explicitly selected,
        # fall back to the appointment employee.
        seller_id = (
            payload.staff_id
            if payload.staff_id is not None
            else appt.staff_id
        )

    else:
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    seller = (
        db.query(models.User)
        .filter(
            models.User.id
            == seller_id
        )
        .first()
    )

    if not seller:
        raise HTTPException(
            status_code=400,
            detail="Invalid seller id",
        )

    if seller.role not in (
        "staff",
        "receptionist",
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Product seller must be "
                "staff or receptionist."
            ),
        )

    sale_appointment = (
        _group_appointment_for_seller(
            appt,
            seller.id,
            db,
        )
    )

    if (
        sale_appointment.id
        != appt.id
        and _appointment_is_fully_paid(
            sale_appointment,
            db,
        )
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "The selected seller's grouped "
                "appointment is already fully paid."
            ),
        )

    product = (
        db.query(models.Product)
        .filter(
            models.Product.id
            == payload.product_id
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    qty = int(payload.quantity or 1)

    if product.track_inventory:
        current_stock = int(
            product.stock_quantity or 0
        )

        if current_stock < qty:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Not enough stock for {product.name}. "
                    f"Available: {current_stock}"
                ),
            )

        product.stock_quantity = (
            current_stock - qty
        )

    unit_price = float(
        product.price or 0.0
    )

    total = (
        float(payload.total_price)
        if payload.total_price is not None
        else unit_price * qty
    )

    sale = models.Sale(
        product_id=product.id,
        staff_id=seller.id,
        client_id=sale_appointment.client_id,
        appointment_id=sale_appointment.id,
        quantity=qty,
        total_price=total,
        created_at=datetime.utcnow(),
    )

    rule = None

    if payload.tax_rule_id:
        rule = (
            db.query(models.TaxRule)
            .filter(
                models.TaxRule.id
                == payload.tax_rule_id,
                models.TaxRule.active
                == True,
            )
            .first()
        )

        if not rule:
            raise HTTPException(
                status_code=400,
                detail="Invalid tax_rule_id",
            )

    elif sale_appointment.tax_rule_id:
        rule = db.get(
            models.TaxRule,
            sale_appointment.tax_rule_id,
        )

    else:
        rule = _pick_active_tax_rule(
            db,
            sale.created_at,
        )

    _apply_tax_snapshot_to_sale(
        sale,
        rule,
    )

    db.add(sale)
    db.commit()
    db.refresh(sale)

    return {
        "ok": True,
        "sale_id": sale.id,
        "appointment_id": sale.appointment_id,
        "staff_id": sale.staff_id,
        "staff_name": seller.name,
        "moved_to_seller_ticket": (
            sale.appointment_id
            != appt.id
        ),
    }

# =========================
# UPDATE PRODUCT SELLER
# =========================

class UpdateSaleSellerPayload(BaseModel):
    staff_id: int


@router.put(
    "/{appointment_id}/sales/{sale_id}/seller",
)
def update_sale_seller(
    appointment_id: int,
    sale_id: int,
    payload: UpdateSaleSellerPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    appointment = (
        db.query(
            models.Appointment
        )
        .filter(
            models.Appointment.id
            == appointment_id
        )
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found.",
        )

    sale = (
        db.query(
            models.Sale
        )
        .filter(
            models.Sale.id
            == sale_id,

            models.Sale.appointment_id
            == appointment.id,
        )
        .first()
    )

    if not sale:
        raise HTTPException(
            status_code=404,
            detail="Product sale not found.",
        )

    if _appointment_is_fully_paid(
        appointment,
        db,
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "The seller cannot be changed after "
                "the appointment is fully paid."
            ),
        )

    if current_user.role == "staff":
        if (
            appointment.staff_id
            != current_user.id
            or payload.staff_id
            != current_user.id
        ):
            raise HTTPException(
                status_code=403,
                detail="Forbidden.",
            )

        seller_id = current_user.id

    elif current_user.role in (
        "owner",
        "receptionist",
    ):
        seller_id = payload.staff_id

    else:
        raise HTTPException(
            status_code=403,
            detail="Forbidden.",
        )

    seller = (
        db.query(
            models.User
        )
        .filter(
            models.User.id
            == seller_id,

            models.User.role
            == "staff",
        )
        .first()
    )

    if not seller:
        raise HTTPException(
            status_code=400,
            detail="Invalid product seller.",
        )

    target = (
        _group_appointment_for_seller(
            appointment,
            seller.id,
            db,
        )
    )

    if (
        target.id
        != appointment.id
        and _appointment_is_fully_paid(
            target,
            db,
        )
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "The selected seller's grouped "
                "appointment is fully paid."
            ),
        )

    sale.staff_id = seller.id
    sale.appointment_id = target.id
    sale.client_id = target.client_id

    db.commit()
    db.refresh(
        sale
    )

    return {
        "ok":
            True,

        "sale_id":
            sale.id,

        "appointment_id":
            sale.appointment_id,

        "staff_id":
            sale.staff_id,

        "staff_name":
            seller.name,

        "moved_to_seller_ticket":
            (
                sale.appointment_id
                != appointment.id
            ),
    }


# =========================
# UPDATE PRODUCT QUANTITY
# =========================

class UpdateSaleQuantityPayload(BaseModel):
    quantity: int = Field(
        ...,
        ge=1,
    )


@router.put(
    "/{appointment_id}/sales/{sale_id}",
)
def update_sale_quantity(
    appointment_id: int,
    sale_id: int,
    payload: UpdateSaleQuantityPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    appt = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.id
            == appointment_id
        )
        .first()
    )

    if not appt:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found",
        )

    if (
        current_user.role == "staff"
        and appt.staff_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    # Paid appointments are locked.
    if _appointment_is_fully_paid(
        appt,
        db,
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Product quantity cannot be changed "
                "after the appointment has been paid."
            ),
        )

    sale = (
        db.query(models.Sale)
        .filter(
            models.Sale.id == sale_id,
            models.Sale.appointment_id
            == appointment_id,
        )
        .first()
    )

    if not sale:
        raise HTTPException(
            status_code=404,
            detail="Product sale not found.",
        )

    product = (
        db.query(models.Product)
        .filter(
            models.Product.id
            == sale.product_id
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found.",
        )

    old_quantity = int(
        sale.quantity or 0
    )
    new_quantity = int(
        payload.quantity
    )

    quantity_difference = (
        new_quantity - old_quantity
    )

    if product.track_inventory:
        current_stock = int(
            product.stock_quantity or 0
        )

        if quantity_difference > 0:
            if current_stock < quantity_difference:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Not enough stock for {product.name}. "
                        f"Available: {current_stock}"
                    ),
                )

            product.stock_quantity = (
                current_stock
                - quantity_difference
            )

        elif quantity_difference < 0:
            product.stock_quantity = (
                current_stock
                + abs(quantity_difference)
            )

    sale.quantity = new_quantity

    unit_price = float(
        product.price or 0.0
    )

    sale.total_price = round(
        unit_price * new_quantity,
        2,
    )

    # Recalculate the product's tax snapshot.
    if sale.tax_rule_id:
        rule = db.get(
            models.TaxRule,
            sale.tax_rule_id,
        )
    elif appt.tax_rule_id:
        rule = db.get(
            models.TaxRule,
            appt.tax_rule_id,
        )
    else:
        rule = _pick_active_tax_rule(
            db,
            sale.created_at,
        )

    _apply_tax_snapshot_to_sale(
        sale,
        rule,
    )

    db.commit()
    db.refresh(sale)

    return {
        "ok": True,
        "sale_id": sale.id,
        "quantity": sale.quantity,
        "subtotal": float(
            sale.total_price or 0.0
        ),
        "tax": float(
            sale.retail_tax_amount or 0.0
        ),
        "total": float(
            sale.total_with_tax
            or sale.total_price
            or 0.0
        ),
    }


# =========================
# REMOVE PRODUCT SALE
# =========================

@router.delete(
    "/{appointment_id}/sales/{sale_id}",
    status_code=204,
)
def remove_sale_from_appointment(
    appointment_id: int,
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    appt = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.id
            == appointment_id
        )
        .first()
    )

    if not appt:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found",
        )

    if (
        current_user.role == "staff"
        and appt.staff_id
        != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    # Paid tickets are historical records.
    # Their products must remain unchanged.
    if _appointment_is_fully_paid(
        appt,
        db,
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Products cannot be removed "
                "after the appointment has been paid."
            ),
        )

    # Make sure this sale actually belongs
    # to this specific appointment.
    sale = (
        db.query(models.Sale)
        .filter(
            models.Sale.id
            == sale_id,
            models.Sale.appointment_id
            == appointment_id,
        )
        .first()
    )

    if not sale:
        raise HTTPException(
            status_code=404,
            detail=(
                "Product sale not found "
                "on this appointment."
            ),
        )

    product = (
        db.query(models.Product)
        .filter(
            models.Product.id
            == sale.product_id
        )
        .first()
    )

    if (
        product
        and product.track_inventory
    ):
        product.stock_quantity = (
            int(product.stock_quantity or 0)
            + int(sale.quantity or 0)
        )

    db.delete(sale)
    db.commit()

    return Response(
        status_code=204
    )


# =========================
# APPOINTMENT SALES
# =========================

@router.get(
    "/{appointment_id}/sales",
)
def get_appointment_sales(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    appt = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.id
            == appointment_id
        )
        .first()
    )

    if not appt:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found",
        )

    if (
        current_user.role == "staff"
        and appt.staff_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    sales = (
        db.query(models.Sale)
        .filter(
            models.Sale.appointment_id
            == appointment_id
        )
        .order_by(
            models.Sale.created_at.asc()
        )
        .all()
    )

    result = []

    for sale in sales:
        product = (
            db.query(models.Product)
            .filter(
                models.Product.id
                == sale.product_id
            )
            .first()
        )

        seller = (
            db.query(models.User)
            .filter(
                models.User.id
                == sale.staff_id
            )
            .first()
        )

        result.append(
            {
                "sale_id": sale.id,
                "product_id": sale.product_id,

                "staff_id": sale.staff_id,

                "staff_name": (
                    seller.name
                    if seller
                    else f"Staff #{sale.staff_id}"
                ),

                "name": (
                    product.name
                    if product
                    else f"Product #{sale.product_id}"
                ),

                "quantity": sale.quantity,

                "subtotal": float(
                    sale.total_price or 0.0
                ),

                "tax": float(
                sale.retail_tax_amount or 0.0
                ),

                "total": float(
                    sale.total_with_tax
                    or sale.total_price
                    or 0.0
                ),
            }
        )

    return result


# =========================
# DELETE
# =========================

@router.delete(
    "/{appointment_id}",
    status_code=204,
)
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    obj = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.id
            == appointment_id
        )
        .first()
    )

    if not obj:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found",
        )

    if (
        current_user.role == "staff"
        and obj.staff_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    protected_payment = (
        db.query(models.Payment)
        .filter(
            models.Payment.appointment_id
            == appointment_id,
            models.Payment.status.in_(
                (
                    "pending",
                    "paid",
                )
            ),
        )
        .first()
    )

    if protected_payment:
        raise HTTPException(
            status_code=409,
            detail=(
                "Appointments with a pending or completed "
                "payment cannot be deleted. Cancel the "
                "appointment instead."
            ),
        )

    db.query(models.Payment).filter(
        models.Payment.appointment_id
        == appointment_id
    ).delete(
        synchronize_session=False
    )

    db.query(models.Sale).filter(
        models.Sale.appointment_id
        == appointment_id
    ).delete(
        synchronize_session=False
    )

    db.delete(obj)
    db.commit()

    return Response(
        status_code=204
    )