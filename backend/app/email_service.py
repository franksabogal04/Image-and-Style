# backend/app/email_service.py

import html
import os
from datetime import datetime

import resend
from sqlalchemy.orm import Session

from . import models


def _sender():
    return os.getenv(
        "RESEND_FROM_EMAIL",
        (
            "Image & Style "
            "<onboarding@resend.dev>"
        ),
    )


def _safe(value):
    return html.escape(
        str(
            value
            if value is not None
            else ""
        )
    )


def _message_id(result):
    if isinstance(
        result,
        dict,
    ):
        return (
            result.get("id")
            or result.get("message_id")
        )

    return getattr(
        result,
        "id",
        None,
    )


def send_booking_confirmation_email(
    db: Session,
    appointment: models.Appointment,
):
    notification = (
        db.query(
            models.AppointmentNotification
        )
        .filter(
            models.AppointmentNotification
            .appointment_id
            == appointment.id,

            models.AppointmentNotification
            .kind
            == "confirmation",
        )
        .first()
    )


    if (
        notification
        and notification.status
        == "sent"
    ):
        return {
            "sent":
                False,

            "reason":
                "already_sent",
        }


    client = (
        db.query(models.Client)
        .filter(
            models.Client.id
            == appointment.client_id
        )
        .first()
    )


    recipient = (
        (
            client.email
            if client
            else ""
        )
        or ""
    ).strip().lower()


    if not recipient:
        if not notification:
            notification = (
                models.AppointmentNotification(
                    appointment_id=
                        appointment.id,

                    kind=
                        "confirmation",

                    status=
                        "skipped",

                    recipient=
                        None,

                    error_message=
                        "Client has no email address.",
                )
            )

            db.add(
                notification
            )

        else:
            notification.status = (
                "skipped"
            )

            notification.error_message = (
                "Client has no email address."
            )

        db.commit()

        return {
            "sent":
                False,

            "reason":
                "missing_email",
        }


    if not notification:
        notification = (
            models.AppointmentNotification(
                appointment_id=
                    appointment.id,

                kind=
                    "confirmation",

                status=
                    "pending",

                recipient=
                    recipient,
            )
        )

        db.add(
            notification
        )

    else:
        notification.status = (
            "pending"
        )

        notification.recipient = (
            recipient
        )

        notification.error_message = (
            None
        )


    db.commit()
    db.refresh(
        notification
    )


    api_key = os.getenv(
        "RESEND_API_KEY"
    )


    if not api_key:
        notification.status = (
            "failed"
        )

        notification.error_message = (
            "RESEND_API_KEY is not configured."
        )

        db.commit()

        return {
            "sent":
                False,

            "reason":
                "missing_api_key",
        }


    staff = (
        db.query(models.User)
        .filter(
            models.User.id
            == appointment.staff_id
        )
        .first()
    )


    customer_name = (
        " ".join(
            [
                (
                    client.first_name
                    or ""
                ).strip(),

                (
                    client.last_name
                    or ""
                ).strip(),
            ]
        ).strip()
        or "Client"
    )


    staff_name = (
        staff.name
        if staff
        else "Your professional"
    )


    appointment_date = (
        appointment.start_time.strftime(
            "%A, %B %d, %Y"
        )
    )


    appointment_time = (
        appointment.start_time.strftime(
            "%I:%M %p"
        ).lstrip("0")
    )


    deposit_amount = round(
        float(
            appointment.deposit_amount
            or 0.0
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
            - deposit_amount,
        ),
        2,
    )


    resend.api_key = (
        api_key
    )


    try:
        result = resend.Emails.send(
            {
                "from":
                    _sender(),

                "to": [
                    recipient,
                ],

                "subject":
                    (
                        "Your Image & Style "
                        "appointment is confirmed"
                    ),

                "html":
                    f"""
                    <div style="
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 28px;
                        color: #17213D;
                    ">
                        <div style="
                            background: #102E73;
                            color: white;
                            padding: 22px;
                            border-radius: 16px 16px 0 0;
                        ">
                            <div style="
                                font-size: 13px;
                                opacity: 0.8;
                                margin-bottom: 5px;
                            ">
                                IMAGE &amp; STYLE
                            </div>

                            <h1 style="
                                margin: 0;
                                font-size: 24px;
                            ">
                                Appointment Confirmed
                            </h1>
                        </div>

                        <div style="
                            border: 1px solid #DCE3F1;
                            border-top: 0;
                            border-radius: 0 0 16px 16px;
                            padding: 24px;
                        ">
                            <p style="
                                font-size: 16px;
                                margin-top: 0;
                            ">
                                Hi {_safe(customer_name)},
                            </p>

                            <p>
                                Your appointment is confirmed.
                                We look forward to seeing you!
                            </p>

                            <div style="
                                background: #F4F7FC;
                                border-radius: 12px;
                                padding: 18px;
                                margin: 20px 0;
                            ">
                                <p>
                                    <strong>Service:</strong>
                                    {_safe(appointment.service_name)}
                                </p>

                                <p>
                                    <strong>Professional:</strong>
                                    {_safe(staff_name)}
                                </p>

                                <p>
                                    <strong>Date:</strong>
                                    {_safe(appointment_date)}
                                </p>

                                <p>
                                    <strong>Time:</strong>
                                    {_safe(appointment_time)}
                                </p>

                                <p>
                                    <strong>Deposit paid:</strong>
                                    ${deposit_amount:.2f}
                                </p>

                                <p style="margin-bottom: 0;">
                                    <strong>Remaining service balance:</strong>
                                    ${remaining_balance:.2f}
                                </p>
                            </div>

                            <p style="
                                color: #667085;
                                font-size: 13px;
                                margin-bottom: 0;
                            ">
                                Please keep this email for your records.
                            </p>
                        </div>
                    </div>
                    """,
            }
        )


        notification.status = (
            "sent"
        )

        notification.provider_message_id = (
            _message_id(
                result
            )
        )

        notification.error_message = (
            None
        )

        notification.sent_at = (
            datetime.utcnow()
        )

        db.commit()


        return {
            "sent":
                True,

            "recipient":
                recipient,

            "message_id":
                notification
                .provider_message_id,
        }


    except Exception as error:
        notification.status = (
            "failed"
        )

        notification.error_message = (
            str(error)[:1000]
        )

        db.commit()


        return {
            "sent":
                False,

            "reason":
                "provider_error",

            "error":
                str(error),
        }
