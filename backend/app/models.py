from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from .database import Base

# --------------------
# Users / Clients / Appointments
# --------------------

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="staff")
    password_hash = Column(String, nullable=False)

    # NEW: profession slug (e.g., 'hair', 'nails', 'skincare') and optional photo URL
    profession = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)

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


class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True, unique=False, index=True)

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

# --- Services ---
class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    duration_minutes = Column(Integer, nullable=False)  # e.g., 30
    price = Column(Float, nullable=False, default=0.0)

    # NEW: category slug to match staff.profession (e.g., 'hair', 'nails', 'skincare')
    category = Column(String, nullable=True)

    appointments = relationship("Appointment", back_populates="service")


class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    staff_id  = Column(Integer, ForeignKey("users.id",   ondelete="CASCADE"), nullable=False)

    # Link to service (optional so old rows still work)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="SET NULL"), nullable=True)

    # Snapshots so history still shows even if a service changes later
    service_name = Column(String, nullable=False)
    start_time   = Column(DateTime, nullable=False)
    end_time     = Column(DateTime, nullable=False)
    notes        = Column(String, nullable=True)
    price        = Column(Float, nullable=True)
    tip          = Column(Float, nullable=True)

    client  = relationship("Client", back_populates="appointments", foreign_keys=[client_id])
    staff   = relationship("User",   back_populates="appointments_as_staff", foreign_keys=[staff_id])
    service = relationship("Service", back_populates="appointments")

    sales = relationship("Sale", back_populates="appointment", foreign_keys="Sale.appointment_id")


# --------------------
# Products / Sales
# --------------------

class Product(Base):
    __tablename__ = "products"
    id    = Column(Integer, primary_key=True, index=True)
    name  = Column(String, nullable=False, unique=True)
    price = Column(Float, nullable=False, default=0.0)

    sales = relationship(
        "Sale",
        back_populates="product",
        cascade="all, delete-orphan",
        foreign_keys="Sale.product_id",
    )


class Sale(Base):
    __tablename__ = "sales"
    id             = Column(Integer, primary_key=True, index=True)
    product_id     = Column(Integer, ForeignKey("products.id",   ondelete="CASCADE"),  nullable=False)
    staff_id       = Column(Integer, ForeignKey("users.id",      ondelete="CASCADE"),  nullable=False)
    client_id      = Column(Integer, ForeignKey("clients.id",    ondelete="SET NULL"), nullable=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)

    quantity    = Column(Integer, nullable=False, default=1)
    total_price = Column(Float,   nullable=False, default=0.0)
    created_at  = Column(DateTime, nullable=False)

    product     = relationship("Product",     back_populates="sales",          foreign_keys=[product_id])
    staff       = relationship("User",        back_populates="sales_as_staff", foreign_keys=[staff_id])
    client      = relationship("Client",      back_populates="sales",          foreign_keys=[client_id])
    appointment = relationship("Appointment", back_populates="sales",          foreign_keys=[appointment_id])


# --------------------
# Time Tracking
# --------------------

class TimeEntry(Base):
    __tablename__ = "time_entries"
    id        = Column(Integer, primary_key=True, index=True)
    user_id   = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    clock_in  = Column(DateTime, nullable=False)
    clock_out = Column(DateTime, nullable=True)

    user   = relationship("User", back_populates="time_entries", foreign_keys=[user_id])
    breaks = relationship("BreakEntry", back_populates="time_entry", cascade="all, delete-orphan")


class BreakEntry(Base):
    __tablename__ = "break_entries"
    id            = Column(Integer, primary_key=True, index=True)
    time_entry_id = Column(Integer, ForeignKey("time_entries.id", ondelete="CASCADE"), nullable=False)
    start         = Column(DateTime, nullable=False)
    end           = Column(DateTime, nullable=True)

    time_entry = relationship("TimeEntry", back_populates="breaks")
