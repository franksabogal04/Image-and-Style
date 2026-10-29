import os

from datetime import timedelta

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
)

from sqlalchemy.orm import Session

from twilio.twiml.messaging_response import (
    MessagingResponse,
)

from ..database import get_db
from .. import models, deps

from ..sms_service import (
    REMINDER_KIND,
    normalize_phone,
    public_webhook_url,
    salon_now,
    send_due_appointment_reminders,
    twilio_is_configured,
    validate_twilio_request,
)


router = APIRouter()


def twiml_response(
    message=None,
):
    response = MessagingResponse()

    if message:
        response.message(
            message
        )

    return Response(
        content=
            str(
                response
            ),

        media_type=
            "application/xml",
    )


def request_url_for_validation(
    request,
):
    configured_base = os.getenv(
        "TWILIO_WEBHOOK_BASE_URL",
        "",
    ).strip().rstrip("/")

    if configured_base:
        url = (
            configured_base
            + request.url.path
        )

        if request.url.query:
            url += (
                "?"
                + request.url.query
            )

        return url

    return str(
        request.url
    )


async def webhook_parameters(
    request,
):
    form = await request.form()

    return {
        str(key):
            str(value)

        for key, value
        in form.items()
    }


def require_valid_twilio_request(
    request,
    parameters,
):
    signature = request.headers.get(
        "X-Twilio-Signature",
        "",
    )

    valid = validate_twilio_request(
        request_url_for_validation(
            request
        ),
        parameters,
        signature,
    )

    if not valid:
        raise HTTPException(
            status_code=403,
            detail=(
                "Invalid Twilio webhook signature."
            ),
        )


def find_client_by_phone(
    db,
    phone,
):
    normalized = normalize_phone(
        phone
    )

    if not normalized:
        return None

    clients = (
        db.query(
            models.Client
        )
        .filter(
            models.Client.phone.isnot(
                None
            )
        )
        .all()
    )

    for client in clients:
        if (
            normalize_phone(
                client.phone
            )
            == normalized
        ):
            return client

    return None


@router.get(
    "/health"
)
def sms_health(
    current_user: models.User = Depends(
        deps.get_current_user
    ),
):
    return {
        "configured":
            twilio_is_configured(),

        "phone_number_configured":
            bool(
                os.getenv(
                    "TWILIO_PHONE_NUMBER"
                )
            ),

        "webhook_base_url_configured":
            bool(
                os.getenv(
                    "TWILIO_WEBHOOK_BASE_URL"
                )
            ),
    }


@router.post(
    "/reminders/run"
)
def run_reminders_now(
    current_user: models.User = Depends(
        deps.require_roles(
            "owner",
            "receptionist",
        )
    ),
):
    return (
        send_due_appointment_reminders()
    )


@router.post(
    "/inbound"
)
async def incoming_sms(
    request: Request,
    db: Session = Depends(
        get_db
    ),
):
    parameters = await webhook_parameters(
        request
    )

    require_valid_twilio_request(
        request,
        parameters,
    )

    sender = parameters.get(
        "From",
        "",
    )

    body = parameters.get(
        "Body",
        "",
    ).strip()

    normalized_reply = (
        " ".join(
            body.upper().split()
        )
    )

    client = find_client_by_phone(
        db,
        sender,
    )

    if not client:
        return twiml_response(
            "Image & Style received your "
            "message. Please call the salon "
            "for assistance."
        )

    stop_words = {
        "STOP",
        "STOPALL",
        "UNSUBSCRIBE",
        "CANCEL",
        "END",
        "QUIT",
    }

    start_words = {
        "START",
        "UNSTOP",
    }

    if normalized_reply in stop_words:
        client.sms_opted_out = True

        db.commit()

        return twiml_response()

    if normalized_reply in start_words:
        client.sms_opted_out = False

        db.commit()

        return twiml_response(
            "Image & Style text messages "
            "have been enabled again."
        )

    now = salon_now()

    appointment = (
        db.query(
            models.Appointment
        )
        .join(
            models.AppointmentNotification,
            models.AppointmentNotification
            .appointment_id
            == models.Appointment.id,
        )
        .filter(
            models.Appointment.client_id
            == client.id,

            models.Appointment.booking_status
            == "confirmed",

            models.Appointment.start_time
            >= now
            - timedelta(
                hours=4
            ),

            models.AppointmentNotification.kind
            == REMINDER_KIND,

            models.AppointmentNotification.status
            == "sent",
        )
        .order_by(
            models.Appointment.start_time.asc()
        )
        .first()
    )

    if not appointment:
        return twiml_response(
            "Image & Style received your "
            "message. Please call the salon "
            "for assistance."
        )

    appointment.sms_reply = (
        body[:1000]
    )

    appointment.sms_replied_at = (
        now
    )

    confirmation_words = {
        "C",
        "CONFIRM",
        "CONFIRMED",
        "YES",
        "Y",
    }

    if normalized_reply in confirmation_words:
        appointment.sms_confirmation_status = (
            "confirmed"
        )

        db.commit()

        time_text = (
            appointment.start_time
            .strftime(
                "%I:%M %p"
            )
            .lstrip("0")
        )

        return twiml_response(
            "Thank you! Your Image & Style "
            f"appointment at {time_text} "
            "is confirmed."
        )

    appointment.sms_confirmation_status = (
        "needs_attention"
    )

    db.commit()

    return twiml_response(
        "We received your message. "
        "Image & Style will contact you "
        "about your appointment."
    )


@router.post(
    "/status"
)
async def sms_delivery_status(
    request: Request,
    db: Session = Depends(
        get_db
    ),
):
    parameters = await webhook_parameters(
        request
    )

    require_valid_twilio_request(
        request,
        parameters,
    )

    message_sid = parameters.get(
        "MessageSid",
        "",
    )

    message_status = parameters.get(
        "MessageStatus",
        "",
    ).lower()

    notification = (
        db.query(
            models.AppointmentNotification
        )
        .filter(
            models.AppointmentNotification
            .provider_message_id
            == message_sid
        )
        .first()
    )

    if notification:
        if message_status in (
            "failed",
            "undelivered",
        ):
            notification.status = (
                "failed"
            )

            notification.error_message = (
                parameters.get(
                    "ErrorMessage"
                )
                or parameters.get(
                    "ErrorCode"
                )
                or message_status
            )

            appointment = (
                db.query(
                    models.Appointment
                )
                .filter(
                    models.Appointment.id
                    == notification.appointment_id
                )
                .first()
            )

            if (
                appointment
                and appointment
                .sms_confirmation_status
                == "awaiting_reply"
            ):
                appointment.sms_confirmation_status = (
                    "failed"
                )

        elif message_status in (
            "sent",
            "delivered",
        ):
            notification.status = (
                "sent"
            )

        db.commit()

    return twiml_response()
