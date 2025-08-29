from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="staff")
    hashed_password = Column(String, nullable=False)

    # Appointments where this user is the staff member
    appointments_as_staff = relationship(
        "Appointment",
        back_populates="staff",
        cascade="all, delete-orphan",
        foreign_keys="Appointment.staff_id",
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

class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        # Optional: don’t allow exact duplicate time slots per client/staff
        # UniqueConstraint("client_id", "start_time", name="uq_client_start"),
        # UniqueConstraint("staff_id", "start_time", name="uq_staff_start"),
    )

    id = Column(Integer, primary_key=True, index=True)

    # FOREIGN KEYS ✅
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    staff_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    service_name = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    notes = Column(String, nullable=True)
    price = Column(Float, nullable=True)

    # Relationships
    client = relationship("Client", back_populates="appointments", foreign_keys=[client_id])
    staff = relationship("User", back_populates="appointments_as_staff", foreign_keys=[staff_id])