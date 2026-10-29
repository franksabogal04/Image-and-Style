# backend/app/models.py

from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Float,
    Boolean,
    UniqueConstraint,
)

from sqlalchemy.orm import relationship

from .database import Base


# =========================================================
# USERS
# =========================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    email = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    name = Column(
        String,
        nullable=False,
    )

    role = Column(
        String,
        nullable=False,
        default="staff",
    )

    password_hash = Column(
        String,
        nullable=False,
    )

    # Profession slug:
    # hair / nails / skincare / eyelashes / etc.
    profession = Column(
        String,
        nullable=True,
    )

    avatar_url = Column(
        String,
        nullable=True,
    )


    appointments_as_staff = relationship(
        "Appointment",
        back_populates="staff",
        cascade="all, delete-orphan",
        foreign_keys="Appointment.staff_id",
    )


    sales_as_staff = relationship(
        "Sale",
        back_populates="staff",
        cascade="all, delete-orphan",
        foreign_keys="Sale.staff_id",
    )


    time_entries = relationship(
        "TimeEntry",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="TimeEntry.user_id",
    )


# =========================================================
# CLIENTS
# =========================================================

class Client(Base):
    __tablename__ = "clients"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    first_name = Column(
        String,
        nullable=False,
    )

    last_name = Column(
        String,
        nullable=False,
    )

    phone = Column(
        String,
        nullable=True,
    )

    email = Column(
        String,
        nullable=True,
        unique=False,
        index=True,
    )


    # Transactional appointment reminders.
    sms_reminders_enabled = Column(
        Boolean,
        nullable=False,
        default=True,
    )


    # Promotional texts require separate consent.
    sms_marketing_opt_in = Column(
        Boolean,
        nullable=False,
        default=False,
    )


    # Set when the client replies STOP.
    sms_opted_out = Column(
        Boolean,
        nullable=False,
        default=False,
    )


    appointments = relationship(
        "Appointment",
        back_populates="client",
        cascade="all, delete-orphan",
        foreign_keys="Appointment.client_id",
    )


    sales = relationship(
        "Sale",
        back_populates="client",
        cascade="all, delete-orphan",
        foreign_keys="Sale.client_id",
    )


# =========================================================
# SPECIALTIES
# =========================================================

class Specialty(Base):
    """
    Owner-managed categories such as:

    hair
    nails
    skincare
    eyelashes
    """

    __tablename__ = "specialties"


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    slug = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
    )


    label = Column(
        String,
        nullable=True,
    )


# =========================================================
# TAX RULES
# =========================================================

class TaxRule(Base):
    """
    Configurable tax rules.

    Rates are stored as decimals.

    Example:

        0.07 = 7%
    """

    __tablename__ = "tax_rules"


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    name = Column(
        String,
        nullable=False,
    )


    jurisdiction = Column(
        String,
        nullable=True,
    )


    service_rate = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    retail_rate = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    tips_taxable = Column(
        Boolean,
        nullable=False,
        default=False,
    )


    effective_from = Column(
        DateTime,
        nullable=True,
    )


    effective_to = Column(
        DateTime,
        nullable=True,
    )


    active = Column(
        Boolean,
        nullable=False,
        default=True,
    )


    appointments = relationship(
        "Appointment",
        back_populates="tax_rule",
    )


    sales = relationship(
        "Sale",
        back_populates="tax_rule",
    )


# =========================================================
# SERVICES
# =========================================================

class Service(Base):
    __tablename__ = "services"


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    name = Column(
        String,
        nullable=False,
        unique=True,
    )


    duration_minutes = Column(
        Integer,
        nullable=False,
    )


    price = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    # Matches staff.profession / Specialty.slug
    category = Column(
        String,
        nullable=True,
    )


    appointments = relationship(
        "Appointment",
        back_populates="service",
    )


# =========================================================
# APPOINTMENTS
# =========================================================

class Appointment(Base):
    __tablename__ = "appointments"


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    client_id = Column(
        Integer,
        ForeignKey(
            "clients.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )


    staff_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )


    service_id = Column(
        Integer,
        ForeignKey(
            "services.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )


    # Snapshot information
    service_name = Column(
        String,
        nullable=False,
    )


    start_time = Column(
        DateTime,
        nullable=False,
    )


    end_time = Column(
        DateTime,
        nullable=False,
    )


    notes = Column(
        String,
        nullable=True,
    )


    # Service amount before tax
    price = Column(
        Float,
        nullable=True,
    )


    # Tip eventually paid by customer
    tip = Column(
        Float,
        nullable=True,
        default=0.0,
    )


    # =====================================================
    # TAX SNAPSHOT
    # =====================================================

    tax_rule_id = Column(
        Integer,
        ForeignKey(
            "tax_rules.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )


    service_tax_rate = Column(
        Float,
        nullable=True,
    )


    tip_tax_rate = Column(
        Float,
        nullable=True,
    )


    service_tax_amount = Column(
        Float,
        nullable=True,
    )


    tip_tax_amount = Column(
        Float,
        nullable=True,
    )


    total_with_tax = Column(
        Float,
        nullable=True,
    )


    # =====================================================
    # ONLINE BOOKING / DEPOSIT
    # =====================================================

    # How this appointment entered the system:
    # staff / online
    booking_source = Column(
        String,
        nullable=False,
        default="staff",
        index=True,
    )


    # Online booking lifecycle:
    #
    # pending_deposit
    # confirmed
    # cancelled
    # late_cancelled
    #
    # Staff-created appointments default to confirmed.
    booking_status = Column(
        String,
        nullable=False,
        default="confirmed",
        index=True,
    )


    # Secret token used by a public customer to manage
    # their own booking without requiring a staff login.
    booking_token = Column(
        String,
        nullable=True,
        unique=True,
        index=True,
    )


    # Whether this appointment was created with a
    # required online booking deposit.
    deposit_required = Column(
        Boolean,
        nullable=False,
        default=False,
    )


    # Required deposit amount in dollars.
    deposit_amount = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    # Pending online bookings can expire if the customer
    # never completes Stripe Checkout.
    deposit_expires_at = Column(
        DateTime,
        nullable=True,
        index=True,
    )


    # =====================================================
    # SMS REMINDER / CONFIRMATION
    # =====================================================

    # not_sent / awaiting_reply / confirmed /
    # needs_attention / opted_out / failed
    sms_confirmation_status = Column(
        String,
        nullable=False,
        default="not_sent",
        index=True,
    )


    # Exact response received from the customer.
    sms_reply = Column(
        String,
        nullable=True,
    )


    sms_replied_at = Column(
        DateTime,
        nullable=True,
    )


    # =====================================================
    # RELATIONSHIPS
    # =====================================================

    client = relationship(
        "Client",
        back_populates="appointments",
        foreign_keys=[client_id],
    )


    staff = relationship(
        "User",
        back_populates="appointments_as_staff",
        foreign_keys=[staff_id],
    )


    service = relationship(
        "Service",
        back_populates="appointments",
    )


    tax_rule = relationship(
        "TaxRule",
        back_populates="appointments",
    )


    sales = relationship(
        "Sale",
        back_populates="appointment",
        foreign_keys="Sale.appointment_id",
    )


    # NEW:
    # Every actual payment made toward this appointment.
    payments = relationship(
        "Payment",
        back_populates="appointment",
        cascade="all, delete-orphan",
        foreign_keys="Payment.appointment_id",
    )


# =========================================================
# GROUPED BOOKINGS
# =========================================================

class BookingGroup(Base):
    """
    Connects multiple simultaneous service appointments
    belonging to the same client and checkout.

    Each service remains its own Appointment so scheduling,
    earnings, staff ownership, refunds, and service history
    continue to work independently.
    """

    __tablename__ = "booking_groups"


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    client_id = Column(
        Integer,
        ForeignKey(
            "clients.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )


    # online / phone / walk_in
    booking_source = Column(
        String,
        nullable=False,
        default="online",
        index=True,
    )


    # pending_deposit / confirmed / cancelled
    booking_status = Column(
        String,
        nullable=False,
        default="pending_deposit",
        index=True,
    )


    # Public access token shared by the complete booking.
    booking_token = Column(
        String,
        nullable=True,
        unique=True,
        index=True,
    )


    deposit_required = Column(
        Boolean,
        nullable=False,
        default=True,
    )


    total_service_amount = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    # Sum of the individual appointment allocations.
    deposit_amount = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    deposit_expires_at = Column(
        DateTime,
        nullable=True,
        index=True,
    )


    # Only one Stripe Checkout session exists for the group.
    stripe_checkout_session_id = Column(
        String,
        nullable=True,
        unique=True,
        index=True,
    )


    stripe_payment_intent_id = Column(
        String,
        nullable=True,
        index=True,
    )


    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )


    client = relationship(
        "Client",
        foreign_keys=[client_id],
    )


    items = relationship(
        "BookingGroupItem",
        back_populates="booking_group",
        cascade="all, delete-orphan",
        order_by="BookingGroupItem.position",
    )


class BookingGroupItem(Base):
    """
    One service inside a grouped booking.

    service_price and deposit_amount are snapshots so the
    allocation never changes if a service price is edited
    later.

    payment_id points to that appointment's own Payment.
    Therefore a combined Stripe charge is still distributed
    correctly across the individual appointments.
    """

    __tablename__ = "booking_group_items"

    __table_args__ = (
        UniqueConstraint(
            "booking_group_id",
            "appointment_id",
            name=(
                "uq_booking_group_appointment"
            ),
        ),

        UniqueConstraint(
            "appointment_id",
            name=(
                "uq_group_item_appointment"
            ),
        ),
    )


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    booking_group_id = Column(
        Integer,
        ForeignKey(
            "booking_groups.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )


    appointment_id = Column(
        Integer,
        ForeignKey(
            "appointments.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )


    payment_id = Column(
        Integer,
        ForeignKey(
            "payments.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        unique=True,
        index=True,
    )


    position = Column(
        Integer,
        nullable=False,
        default=0,
    )


    service_price = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    # Exactly 25% of this item's service_price.
    deposit_amount = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )


    booking_group = relationship(
        "BookingGroup",
        back_populates="items",
        foreign_keys=[booking_group_id],
    )


    appointment = relationship(
        "Appointment",
        foreign_keys=[appointment_id],
    )


    payment = relationship(
        "Payment",
        foreign_keys=[payment_id],
    )



# =========================================================
# PRODUCTS
# =========================================================

class Product(Base):
    __tablename__ = "products"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String,
        nullable=False,
        unique=True,
    )

    price = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    description = Column(
        String,
        nullable=True,
    )

    image_url = Column(
        String,
        nullable=True,
    )

    active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    stock_quantity = Column(
        Integer,
        nullable=False,
        default=0,
    )

    low_stock_threshold = Column(
        Integer,
        nullable=False,
        default=5,
    )

    track_inventory = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    sales = relationship(
        "Sale",
        back_populates="product",
        cascade="all, delete-orphan",
        foreign_keys="Sale.product_id",
    )

# =========================================================
# SALES
# =========================================================

class Sale(Base):
    __tablename__ = "sales"


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    product_id = Column(
        Integer,
        ForeignKey(
            "products.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )


    staff_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )


    client_id = Column(
        Integer,
        ForeignKey(
            "clients.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )


    appointment_id = Column(
        Integer,
        ForeignKey(
            "appointments.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )


    quantity = Column(
        Integer,
        nullable=False,
        default=1,
    )


    # Product subtotal before tax
    total_price = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    created_at = Column(
        DateTime,
        nullable=False,
    )


    # =====================================================
    # TAX SNAPSHOT
    # =====================================================

    tax_rule_id = Column(
        Integer,
        ForeignKey(
            "tax_rules.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )


    retail_tax_rate = Column(
        Float,
        nullable=True,
    )


    retail_tax_amount = Column(
        Float,
        nullable=True,
    )


    total_with_tax = Column(
        Float,
        nullable=True,
    )


    # =====================================================
    # RELATIONSHIPS
    # =====================================================

    product = relationship(
        "Product",
        back_populates="sales",
        foreign_keys=[product_id],
    )


    staff = relationship(
        "User",
        back_populates="sales_as_staff",
        foreign_keys=[staff_id],
    )


    client = relationship(
        "Client",
        back_populates="sales",
        foreign_keys=[client_id],
    )


    appointment = relationship(
        "Appointment",
        back_populates="sales",
        foreign_keys=[appointment_id],
    )


    tax_rule = relationship(
        "TaxRule",
        back_populates="sales",
    )


# =========================================================
# PAYMENTS
# =========================================================

class Payment(Base):
    """
    One actual payment toward an appointment.

    This is deliberately separate from Appointment.

    Why?

    Because later an appointment may have:

        $20 deposit
        +
        $70 final payment
        -
        $20 refund

    without destroying the accounting history.

    Current payment methods:

        cash
        card

    Later we can add:

        other
        gift_card
        deposit
        etc.
    """

    __tablename__ = "payments"


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    appointment_id = Column(
        Integer,
        ForeignKey(
            "appointments.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )


    # Total money actually collected in this payment.
    # Includes service/products/tax/tip.
    amount = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    # Tip included in THIS payment.
    tip_amount = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    # cash / card
    method = Column(
        String,
        nullable=False,
    )


    # pending / paid / cancelled / refunded
    status = Column(
        String,
        nullable=False,
        default="pending",
        index=True,
    )


    stripe_checkout_session_id = Column(
        String,
        nullable=True,
        unique=True,
        index=True,
    )


    stripe_payment_intent_id = Column(
        String,
        nullable=True,
        index=True,
    )


    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )


    appointment = relationship(
        "Appointment",
        back_populates="payments",
        foreign_keys=[appointment_id],
    )



# =========================================================
# APPOINTMENT EMAIL NOTIFICATIONS
# =========================================================

class AppointmentNotification(Base):
    __tablename__ = (
        "appointment_notifications"
    )

    __table_args__ = (
        UniqueConstraint(
            "appointment_id",
            "kind",
            name=(
                "uq_appointment_notification_kind"
            ),
        ),
    )


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    appointment_id = Column(
        Integer,
        ForeignKey(
            "appointments.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )


    # confirmation / reminder
    kind = Column(
        String,
        nullable=False,
        index=True,
    )


    # pending / sent / failed / skipped
    status = Column(
        String,
        nullable=False,
        default="pending",
        index=True,
    )


    recipient = Column(
        String,
        nullable=True,
    )


    provider_message_id = Column(
        String,
        nullable=True,
        index=True,
    )


    error_message = Column(
        String,
        nullable=True,
    )


    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )


    sent_at = Column(
        DateTime,
        nullable=True,
    )


# =========================================================
# REFUNDS
# =========================================================

class Refund(Base):
    """
    One refund transaction made against an appointment payment.

    A refund does NOT replace or delete the original Payment.

    Examples:

        Full visit refund
        Service-only refund
        Product-only refund
        Tip refund

    One original Payment may therefore have multiple Refund rows.
    """

    __tablename__ = "refunds"


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    appointment_id = Column(
        Integer,
        ForeignKey(
            "appointments.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )


    payment_id = Column(
        Integer,
        ForeignKey(
            "payments.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )


    # cash / card
    method = Column(
        String,
        nullable=False,
    )


    # pending / succeeded / failed / cancelled
    status = Column(
        String,
        nullable=False,
        default="pending",
        index=True,
    )


    # Total amount returned to the client,
    # including any refunded tax.
    amount = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    # Stripe refund id for card refunds.
    # Cash refunds will leave this NULL.
    stripe_refund_id = Column(
        String,
        nullable=True,
        unique=True,
        index=True,
    )


    reason = Column(
        String,
        nullable=True,
    )


    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )


    lines = relationship(
        "RefundLine",
        back_populates="refund",
        cascade="all, delete-orphan",
        foreign_keys="RefundLine.refund_id",
    )


# =========================================================
# REFUND LINES
# =========================================================

class RefundLine(Base):
    """
    Individual pieces of a refund.

    kind may be:

        service
        product
        tip

    subtotal is the pre-tax amount being reversed.
    tax_amount is the tax being returned.
    total is subtotal + tax_amount.

    For products, sale_id identifies the exact Sale row.
    staff_id snapshots whose earnings / commission must
    be reversed.
    """

    __tablename__ = "refund_lines"


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    refund_id = Column(
        Integer,
        ForeignKey(
            "refunds.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )


    kind = Column(
        String,
        nullable=False,
        index=True,
    )


    sale_id = Column(
        Integer,
        ForeignKey(
            "sales.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )


    # Employee whose service earnings, tip,
    # or product commission belong to this line.
    staff_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )


    description = Column(
        String,
        nullable=True,
    )


    quantity = Column(
        Integer,
        nullable=True,
    )


    # Amount before tax.
    subtotal = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    tax_amount = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    # Amount actually returned for this line.
    total = Column(
        Float,
        nullable=False,
        default=0.0,
    )


    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )


    refund = relationship(
        "Refund",
        back_populates="lines",
        foreign_keys=[refund_id],
    )


# =========================================================
# TIME TRACKING
# =========================================================

class TimeEntry(Base):
    __tablename__ = "time_entries"


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )


    clock_in = Column(
        DateTime,
        nullable=False,
    )


    clock_out = Column(
        DateTime,
        nullable=True,
    )


    user = relationship(
        "User",
        back_populates="time_entries",
        foreign_keys=[user_id],
    )


    breaks = relationship(
        "BreakEntry",
        back_populates="time_entry",
        cascade="all, delete-orphan",
    )


class BreakEntry(Base):
    __tablename__ = "break_entries"


    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    time_entry_id = Column(
        Integer,
        ForeignKey(
            "time_entries.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )


    start = Column(
        DateTime,
        nullable=False,
    )


    end = Column(
        DateTime,
        nullable=True,
    )


    time_entry = relationship(
        "TimeEntry",
        back_populates="breaks",
    )
