from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List, Literal
from enum import Enum


class RoleEnum(str, Enum):
    owner = "owner"
    receptionist = "receptionist"
    staff = "staff"


# =========================
# Auth / Users
# =========================

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    role: RoleEnum = RoleEnum.staff
    password: str
    profession: Optional[str] = None
    avatar_url: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str
    role: RoleEnum
    profession: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[RoleEnum] = None
    profession: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None


# =========================
# Clients
# =========================

class ClientCreate(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

    sms_reminders_enabled: bool = True
    sms_marketing_opt_in: bool = False


class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

    sms_reminders_enabled: Optional[bool] = None
    sms_marketing_opt_in: Optional[bool] = None


class ClientOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

    sms_reminders_enabled: bool = True
    sms_marketing_opt_in: bool = False
    sms_opted_out: bool = False

    class Config:
        from_attributes = True


class ClientBroadcastEmail(BaseModel):
    subject: str
    message: str


class ClientSmsMessage(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=1000,
    )


class ClientBroadcastSms(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=1000,
    )


# =========================
# Taxes
# =========================

class TaxRuleCreate(BaseModel):
    name: str
    jurisdiction: Optional[str] = None

    service_rate: float = 0.0
    retail_rate: float = 0.0
    tips_taxable: bool = False

    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None

    active: bool = True


class TaxRuleUpdate(BaseModel):
    name: Optional[str] = None
    jurisdiction: Optional[str] = None

    service_rate: Optional[float] = None
    retail_rate: Optional[float] = None
    tips_taxable: Optional[bool] = None

    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None

    active: Optional[bool] = None


class TaxRuleOut(BaseModel):
    id: int
    name: str
    jurisdiction: Optional[str] = None

    service_rate: float
    retail_rate: float
    tips_taxable: bool

    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None

    active: bool

    class Config:
        from_attributes = True


# =========================
# Appointments
# =========================

class AppointmentCreate(BaseModel):
    client_id: int
    staff_id: int

    booking_source: Literal[
        "phone",
        "walk_in",
    ] = "phone"

    service_id: int
    service_name: str

    start_time: datetime
    end_time: datetime

    notes: Optional[str] = None
    price: Optional[float] = None
    tip: Optional[float] = None

    tax_rule_id: Optional[int] = None


class GroupedAppointmentItemCreate(BaseModel):
    staff_id: int
    service_id: int

    start_time: datetime
    end_time: datetime

    notes: Optional[str] = None
    price: Optional[float] = None
    tip: Optional[float] = None

    tax_rule_id: Optional[int] = None


class GroupedAppointmentCreate(BaseModel):
    client_id: int

    booking_source: Literal[
        "phone",
        "walk_in",
    ] = "phone"

    appointments: list[
        GroupedAppointmentItemCreate
    ]



class AppointmentUpdate(BaseModel):
    client_id: Optional[int] = None
    staff_id: Optional[int] = None

    service_id: Optional[int] = None
    service_name: Optional[str] = None

    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    notes: Optional[str] = None
    price: Optional[float] = None
    tip: Optional[float] = None

    tax_rule_id: Optional[int] = None


class AppointmentOut(BaseModel):
    id: int

    client_id: int
    staff_id: int
    service_id: Optional[int] = None

    service_name: str

    start_time: datetime
    end_time: datetime

    notes: Optional[str] = None
    price: Optional[float] = None
    tip: Optional[float] = None

    booking_source: Optional[str] = None
    booking_status: Optional[str] = None

    deposit_required: bool = False
    deposit_amount: Optional[float] = None
    deposit_expires_at: Optional[datetime] = None

    sms_confirmation_status: str = "not_sent"
    sms_reply: Optional[str] = None
    sms_replied_at: Optional[datetime] = None

    tax_rule_id: Optional[int] = None
    service_tax_rate: Optional[float] = None
    tip_tax_rate: Optional[float] = None
    service_tax_amount: Optional[float] = None
    tip_tax_amount: Optional[float] = None
    total_with_tax: Optional[float] = None

    payment_status: str = "unpaid"

    class Config:
        from_attributes = True


# =========================
# PUBLIC BOOKING
# =========================

class PublicAppointmentCreate(BaseModel):
    staff_id: int
    service_id: int

    date: str
    time: str

    client_first_name: str
    client_last_name: str

    client_phone: Optional[str] = None
    client_email: Optional[EmailStr] = None

    notes: Optional[str] = None


class PublicGroupedAppointmentItemCreate(BaseModel):
    staff_id: int
    service_id: int

    date: str
    time: str

    notes: Optional[str] = None


class PublicGroupedAppointmentCreate(BaseModel):
    client_first_name: str
    client_last_name: str

    client_phone: Optional[str] = None
    client_email: Optional[EmailStr] = None

    notes: Optional[str] = None

    appointments: list[
        PublicGroupedAppointmentItemCreate
    ]



# =========================
# Products
# =========================

class ProductCreate(BaseModel):
    name: str

    price: float = Field(
        ge=0
    )

    description: Optional[str] = None
    image_url: Optional[str] = None
    active: bool = True

    stock_quantity: int = Field(
        default=0,
        ge=0,
    )

    low_stock_threshold: int = Field(
        default=5,
        ge=0,
    )

    track_inventory: bool = True


class ProductUpdate(BaseModel):
    name: Optional[str] = None

    price: Optional[float] = Field(
        default=None,
        ge=0,
    )

    description: Optional[str] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None

    stock_quantity: Optional[int] = Field(
        default=None,
        ge=0,
    )

    low_stock_threshold: Optional[int] = Field(
        default=None,
        ge=0,
    )

    track_inventory: Optional[bool] = None


class ProductOut(BaseModel):
    id: int
    name: str
    price: float

    description: Optional[str] = None
    image_url: Optional[str] = None
    active: bool

    stock_quantity: int
    low_stock_threshold: int
    track_inventory: bool

    class Config:
        from_attributes = True


# =========================
# Sales
# =========================

class SaleCreate(BaseModel):
    product_id: int
    staff_id: int

    client_id: Optional[int] = None

    quantity: int = Field(
        default=1,
        ge=1,
    )

    total_price: Optional[float] = None
    created_at: Optional[datetime] = None

    tax_rule_id: Optional[int] = None


class SaleOut(BaseModel):
    id: int

    product_id: int

    # Actual employee who sold the product
    staff_id: int

    client_id: Optional[int] = None

    quantity: int
    total_price: float
    created_at: datetime

    tax_rule_id: Optional[int] = None
    retail_tax_rate: Optional[float] = None
    retail_tax_amount: Optional[float] = None
    total_with_tax: Optional[float] = None

    class Config:
        from_attributes = True


# =========================
# Earnings
# =========================

class EarningsSummary(BaseModel):
    # Full service revenue charged to clients
    services_total: float

    # Employee portion of services: 60%
    staff_service_earnings: float = 0.0

    # Salon portion of services: 40%
    owner_service_share: float = 0.0

    # Tips belong 100% to staff
    tips_total: float

    # Gross retail revenue
    sales_total: float

    # 20% of retail revenue paid to actual seller
    product_commission: float = 0.0

    # 80% of retail revenue retained by salon
    salon_retail_share: float = 0.0

    # Full gross salon revenue for the period
    grand_total: float


# =========================
# Time Tracking
# =========================

class BreakOut(BaseModel):
    id: int
    start: datetime
    end: Optional[datetime] = None

    class Config:
        from_attributes = True


class TimeEntryOut(BaseModel):
    id: int
    user_id: int

    clock_in: datetime
    clock_out: Optional[datetime] = None

    breaks: List[BreakOut] = Field(
        default_factory=list
    )

    class Config:
        from_attributes = True


class TimeSummary(BaseModel):
    worked_minutes: int
    break_minutes: int
    payable_minutes: int

    entries: List[TimeEntryOut]


# =========================
# Services
# =========================

class ServiceCreate(BaseModel):
    name: str
    duration_minutes: int
    price: float = 0.0
    category: Optional[str] = None


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[float] = None
    category: Optional[str] = None


class ServiceOut(BaseModel):
    id: int
    name: str
    duration_minutes: int
    price: float
    category: Optional[str] = None

    class Config:
        from_attributes = True


# =========================
# Specialties
# =========================

class SpecialtyCreate(BaseModel):
    slug: str
    label: Optional[str] = None


class SpecialtyUpdate(BaseModel):
    slug: Optional[str] = None
    label: Optional[str] = None


class SpecialtyOut(BaseModel):
    id: int
    slug: str
    label: Optional[str] = None

    class Config:
        from_attributes = True