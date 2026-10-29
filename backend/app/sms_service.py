import asyncio
import os
import re

from datetime import (
    datetime,
    timedelta,
)

from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from twilio.base.exceptions import (
    TwilioRestException,
)
from twilio.request_validator import (
    RequestValidator,
)
from twilio.rest import Client as TwilioClient

from .database import SessionLocal
from . import models


load_dotenv()


REMINDER_KIND = "sms_reminder_2h"


def salon_now():
    timezone_name = os.getenv(
        "SALON_TIMEZONE",
        "America/New_York",
    )

    try:
        current = datetime.now(
            ZoneInfo(
                timezone_name
            )
        )

    except Exception:
        current = datetime.now()

    # Appointment times are currently stored as
    # timezone-naive local salon times.
    return current.replace(
        tzinfo=None
    )


def normalize_phone(
    phone,
):
    raw = str(
        phone or ""
    ).strip()

    if not raw:
        return None

    digits = re.sub(
        r"\D",
        "",
        raw,
    )

    if len(digits) == 10:
        return (
            "+1"
            + digits
        )

    if (
        len(digits) == 11
        and digits.startswith("1")
    ):
        return (
            "+"
            + digits
        )

    if (
        raw.startswith("+")
        and 8 <= len(digits) <= 15
    ):
        return (
            "+"
            + digits
        )

    return None


def twilio_is_configured():
    return all(
        (
            os.getenv(
                "TWILIO_ACCOUNT_SID"
            ),
            os.getenv(
                "TWILIO_AUTH_TOKEN"
            ),
            os.getenv(
                "TWILIO_PHONE_NUMBER"
            ),
        )
    )


def get_twilio_client():
    account_sid = os.getenv(
        "TWILIO_ACCOUNT_SID",
        "",
    ).strip()

    auth_token = os.getenv(
        "TWILIO_AUTH_TOKEN",
        "",
    ).strip()

    if (
        not account_sid
        or not auth_token
    ):
        raise RuntimeError(
            "Twilio credentials are not configured."
        )

    return TwilioClient(
        account_sid,
        auth_token,
    )


def public_webhook_url(
    path,
):
    base_url = os.getenv(
        "TWILIO_WEBHOOK_BASE_URL",
        "",
    ).strip().rstrip("/")

    if not base_url:
        return None

    return (
        base_url
        + "/"
        + path.lstrip("/")
    )


def send_sms(
    to_phone,
    body,
):
    recipient = normalize_phone(
        to_phone
    )

    if not recipient:
        raise ValueError(
            "The client phone number is invalid."
        )

    sender = normalize_phone(
        os.getenv(
            "TWILIO_PHONE_NUMBER",
            "",
        )
    )

    if not sender:
        raise RuntimeError(
            "TWILIO_PHONE_NUMBER is not configured."
        )

    trial_mode = (
        os.getenv(
            "TWILIO_TRIAL_MODE",
            "false",
        )
        .strip()
        .lower()
        in (
            "1",
            "true",
            "yes",
            "on",
        )
    )

    message_body = (
        "sms_appointment_reminders"
        if trial_mode
        else str(
            body or ""
        ).strip()
    )

    parameters = {
        "to":
            recipient,

        "from_":
            sender,

        "body":
            message_body,
    }

    status_callback = (
        public_webhook_url(
            "/sms/status"
        )
    )

    if status_callback:
        parameters[
            "status_callback"
        ] = status_callback

    return (
        get_twilio_client()
        .messages
        .create(
            **parameters
        )
    )


def validate_twilio_request(
    request_url,
    parameters,
    signature,
):
    validate_enabled = (
        os.getenv(
            "TWILIO_VALIDATE_WEBHOOKS",
            "true",
        )
        .strip()
        .lower()
        in (
            "1",
            "true",
            "yes",
            "on",
        )
    )

    if not validate_enabled:
        return True

    auth_token = os.getenv(
        "TWILIO_AUTH_TOKEN",
        "",
    ).strip()

    if (
        not auth_token
        or not signature
    ):
        return False

    validator = RequestValidator(
        auth_token
    )

    return validator.validate(
        request_url,
        parameters,
        signature,
    )


def build_reminder_message(
    appointment,
    client,
    staff,
):
    first_name = (
        client.first_name
        or "there"
    ).strip()

    service_name = (
        appointment.service_name
        or "appointment"
    ).strip()

    staff_name = (
        staff.name
        if staff
        else "your professional"
    )

    time_text = (
        appointment.start_time
        .strftime(
            "%I:%M %p"
        )
        .lstrip("0")
    )

    salon_phone = os.getenv(
        "SALON_PHONE_NUMBER",
        "",
    ).strip()

    call_text = (
        f"Call {salon_phone} to change it."
        if salon_phone
        else "Call the salon to change it."
    )

    return (
        f"Image & Style: {first_name}, "
        f"reminder for {service_name} "
        f"today at {time_text} with "
        f"{staff_name}. Reply C to confirm. "
        f"{call_text} Cancellations within "
        f"1 hour retain the deposit. "
        f"Reply STOP to opt out."
    )


def send_due_appointment_reminders():
    if not twilio_is_configured():
        return {
            "configured":
                False,

            "sent":
                0,

            "failed":
                0,
        }

    db = SessionLocal()

    sent = 0
    failed = 0
    skipped = 0

    try:
        now = salon_now()

        appointments = (
            db.query(
                models.Appointment
            )
            .join(
                models.Client,
                models.Client.id
                == models.Appointment.client_id,
            )
            .filter(
                models.Appointment.booking_status
                == "confirmed",

                models.Appointment.start_time
                > now,

                models.Appointment.start_time
                <= now
                + timedelta(
                    hours=2
                ),

                models.Client.phone.isnot(
                    None
                ),

                models.Client.sms_reminders_enabled
                == True,

                models.Client.sms_opted_out
                == False,
            )
            .order_by(
                models.Appointment.start_time.asc()
            )
            .all()
        )

        for appointment in appointments:
            previous = (
                db.query(
                    models.AppointmentNotification
                )
                .filter(
                    models.AppointmentNotification
                    .appointment_id
                    == appointment.id,

                    models.AppointmentNotification
                    .kind
                    == REMINDER_KIND,
                )
                .first()
            )

            if (
                previous
                and previous.status in (
                    "pending",
                    "sent",
                )
            ):
                skipped += 1
                continue

            client = (
                db.query(
                    models.Client
                )
                .filter(
                    models.Client.id
                    == appointment.client_id
                )
                .first()
            )

            staff = (
                db.query(
                    models.User
                )
                .filter(
                    models.User.id
                    == appointment.staff_id
                )
                .first()
            )

            recipient = normalize_phone(
                client.phone
                if client
                else None
            )

            if previous:
                notification = previous

                notification.status = (
                    "pending"
                )

                notification.recipient = (
                    recipient
                )

                notification.provider_message_id = (
                    None
                )

                notification.error_message = (
                    None
                )

                notification.sent_at = (
                    None
                )

            else:
                notification = (
                    models.AppointmentNotification(
                        appointment_id=
                            appointment.id,

                        kind=
                            REMINDER_KIND,

                        status=
                            "pending",

                        recipient=
                            recipient,
                    )
                )

                db.add(
                    notification
                )

            db.commit()
            db.refresh(
                notification
            )

            if not recipient:
                notification.status = (
                    "skipped"
                )

                notification.error_message = (
                    "Invalid client phone number."
                )

                appointment.sms_confirmation_status = (
                    "failed"
                )

                db.commit()

                skipped += 1
                continue

            try:
                message = send_sms(
                    recipient,
                    build_reminder_message(
                        appointment,
                        client,
                        staff,
                    ),
                )

                notification.status = (
                    "sent"
                )

                notification.provider_message_id = (
                    message.sid
                )

                notification.sent_at = (
                    salon_now()
                )

                appointment.sms_confirmation_status = (
                    "awaiting_reply"
                )

                appointment.sms_reply = (
                    None
                )

                appointment.sms_replied_at = (
                    None
                )

                db.commit()

                sent += 1

            except Exception as error:
                notification.status = (
                    "failed"
                )

                notification.error_message = (
                    str(
                        error
                    )
                )

                appointment.sms_confirmation_status = (
                    "failed"
                )

                db.commit()

                failed += 1

        return {
            "configured":
                True,

            "sent":
                sent,

            "failed":
                failed,

            "skipped":
                skipped,
        }

    finally:
        db.close()


async def reminder_worker():
    # Allow the application to finish starting.
    await asyncio.sleep(
        5
    )

    while True:
        try:
            await asyncio.to_thread(
                send_due_appointment_reminders
            )

        except asyncio.CancelledError:
            raise

        except Exception as error:
            print(
                "SMS reminder worker error:",
                str(
                    error
                ),
            )

        await asyncio.sleep(
            60
        )
