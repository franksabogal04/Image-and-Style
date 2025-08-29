
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from enum import Enum

class RoleEnum(str, Enum):
    owner = "owner"
    staff = "staff"

# Auth
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    role: RoleEnum = RoleEnum.staff
    password: str

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
    class Config:
        from_attributes = True

# Clients
class ClientCreate(BaseModel):
    first_name: str
    last_name: str
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

# Appointments
class AppointmentCreate(BaseModel):
    client_id: int
    staff_id: int
    service_name: str
    start_time: datetime
    end_time: datetime
    notes: Optional[str] = None
    price: Optional[float] = None  # NEW

class AppointmentOut(BaseModel):
    id: int
    client_id: int
    staff_id: int
    service_name: str
    start_time: datetime
    end_time: datetime
    notes: Optional[str] = None
    price: Optional[float] = None   
    class Config:
        from_attributes = True
