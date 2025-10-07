from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum

class RoleEnum(str, Enum):
    owner = "owner"
    receptionist = "receptionist"
    staff = "staff"

# -------- Auth / Users --------
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    role: RoleEnum = RoleEnum.staff
    password: str
    # NEW
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
    # NEW
    profession: Optional[str] = None
    avatar_url: Optional[str] = None
    class Config:
        from_attributes = True

# NEW: Partial update payload for /users/{id} PATCH
class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[RoleEnum] = None          # only 'staff' or 'receptionist' in your router
    profession: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None           # allow owner to reset password

# -------- Clients --------
class ClientCreate(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class ClientOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    class Config:
        from_attributes = True

# -------- Appointments --------
class AppointmentCreate(BaseModel):
    client_id: int
    staff_id: int
    service_name: str
    start_time: datetime
    end_time: datetime
    notes: Optional[str] = None
    price: Optional[float] = None

class AppointmentUpdate(BaseModel):
    client_id: Optional[int] = None
    staff_id: Optional[int] = None
    service_name: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None
    price: Optional[float] = None
    tip: Optional[float] = None

class AppointmentOut(BaseModel):
    id: int
    client_id: int
    staff_id: int
    service_name: str
    start_time: datetime
    end_time: datetime
    notes: Optional[str] = None
    price: Optional[float] = None
    tip: Optional[float] = None
    class Config:
        from_attributes = True

# -------- Products --------
class ProductCreate(BaseModel):
    name: str
    price: float

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None

class ProductOut(BaseModel):
    id: int
    name: str
    price: float
    class Config:
        from_attributes = True

# -------- Sales --------
class SaleCreate(BaseModel):
    product_id: int
    staff_id: int
    client_id: Optional[int] = None
    quantity: int = 1
    total_price: Optional[float] = None
    created_at: Optional[datetime] = None

class SaleOut(BaseModel):
    id: int
    product_id: int
    staff_id: int
    client_id: Optional[int] = None
    quantity: int
    total_price: float
    created_at: datetime
    class Config:
        from_attributes = True

# -------- Earnings summary --------
class EarningsSummary(BaseModel):
    services_total: float
    tips_total: float
    sales_total: float
    grand_total: float

# -------- Time tracking --------
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
    breaks: List[BreakOut] = Field(default_factory=list)
    class Config:
        from_attributes = True

class TimeSummary(BaseModel):
    worked_minutes: int
    break_minutes: int
    payable_minutes: int
    entries: List[TimeEntryOut]

# -------- Services (NEW) --------
class ServiceCreate(BaseModel):
    name: str
    duration_minutes: int
    price: float = 0.0
    category: Optional[str] = None  # e.g. 'hair', 'nails', etc.

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