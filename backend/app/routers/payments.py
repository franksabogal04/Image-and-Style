# backend/app/routers/payments.py
import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, deps

router = APIRouter()

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


@router.post("/checkout-session")
def create_checkout_session(
    appointment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """
    Creates a Stripe Checkout Session for an appointment.

    TIP COLLECTION:
    - Enable tipping in the Stripe Dashboard for Checkout. Stripe will then show
      tip options to the customer automatically.
    - We log the final tip in the webhook, using the total paid minus our base price.
    """
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured (missing STRIPE_SECRET_KEY).")

    # Load appointment
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.price is None or appt.price < 0:
        raise HTTPException(status_code=400, detail="Appointment has no base price to charge")

    # Base amount in cents (without tip)
    base_amount_cents = int(round(float(appt.price) * 100))

    # Build success/cancel URLs (you can pass your own from the app if you like)
    # For local dev, these can be placeholders.
    # On mobile, you'll just open session.url and let the user pay; success/cancel can be any URL.
    origin = request.headers.get("origin") or "https://example.com"
    success_url = f"{origin}/checkout/success?appointment_id={appt.id}"
    cancel_url = f"{origin}/checkout/cancel?appointment_id={appt.id}"

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {"name": appt.service_name},
                        "unit_amount": base_amount_cents,
                    },
                    "quantity": 1,
                }
            ],
            # Store metadata so the webhook knows which appointment to update,
            # and what the base (no-tip) amount was.
            metadata={
                "appointment_id": str(appt.id),
                "base_amount_cents": str(base_amount_cents),
            },
            payment_intent_data={
                "metadata": {
                    "appointment_id": str(appt.id),
                    "base_amount_cents": str(base_amount_cents),
                }
            },
        )
        return {"id": session.id, "url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Webhook to receive Checkout events and record tips on the appointment.

    HOW TIP IS COMPUTED (robust & simple):
    - We store the appointment's base price in metadata (base_amount_cents).
    - On payment, we read the total paid amount (amount_total).
    - tip_cents = max(0, amount_total - base_amount_cents)
    - This works great when you don't use taxes/discounts/shipping.
      If you add taxes/discounts later, also store those in metadata or compute them.
    """
    if not STRIPE_WEBHOOK_SECRET:
        # If you don't want to verify in dev, you *could* skip verification,
        # but it's strongly recommended to verify signatures.
        # Here we enforce it for safety.
        return JSONResponse(status_code=500, content={"error": "Webhook not configured (STRIPE_WEBHOOK_SECRET missing)."})

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload, sig_header=sig_header, secret=STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        return JSONResponse(status_code=400, content={"error": "Invalid signature"})
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

    # React only to successful Checkout completion
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        # total paid in cents (includes tip if customer added one)
        amount_total = session.get("amount_total")
        metadata = session.get("metadata") or {}
        appt_id_str = metadata.get("appointment_id")
        base_cents_str = metadata.get("base_amount_cents")

        if amount_total is not None and appt_id_str and base_cents_str:
            try:
                appt_id = int(appt_id_str)
                base_amount_cents = int(base_cents_str)
            except ValueError:
                appt_id = None
                base_amount_cents = None

            if appt_id and base_amount_cents is not None:
                tip_cents = max(0, int(amount_total) - int(base_amount_cents))
                tip_dollars = round(tip_cents / 100.0, 2)

                appt = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
                if appt:
                    # Persist the tip on the appointment
                    appt.tip = (appt.tip or 0) + tip_dollars
                    db.commit()

    return {"received": True}