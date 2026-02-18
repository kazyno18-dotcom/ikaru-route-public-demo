import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Date,
    ForeignKey, JSON, Text, Time
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class RoleEnum(str, enum.Enum):
    admin = "admin"
    coordinator = "coordinator"
    staff = "staff"


class ServiceTypeEnum(str, enum.Enum):
    shintai = "身体"
    kaji = "家事"
    seikatsu = "生活"
    judo = "重度"
    shogai = "障がい"


class VisitStatusEnum(str, enum.Enum):
    scheduled = "予定"
    completed = "完了"
    cancelled = "中止"
    not_done = "未実施"


class RouteStatusEnum(str, enum.Enum):
    draft = "draft"
    confirmed = "confirmed"
    completed = "completed"


class CareLevelEnum(str, enum.Enum):
    shien1 = "要支援1"
    shien2 = "要支援2"
    kaigo1 = "要介護1"
    kaigo2 = "要介護2"
    kaigo3 = "要介護3"
    kaigo4 = "要介護4"
    kaigo5 = "要介護5"


def gen_uuid():
    return str(uuid.uuid4())


class Staff(Base):
    __tablename__ = "staff"

    staff_id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(50), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=RoleEnum.staff.value)
    skill_types = Column(JSON, nullable=False, default=list)
    max_hours_day = Column(Float, nullable=False, default=8.0)
    hourly_rate = Column(Integer, nullable=False, default=1000)
    home_address = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    routes = relationship("Route", back_populates="staff")
    visits = relationship("Visit", foreign_keys="Visit.staff_id", back_populates="staff")
    revenues = relationship("Revenue", back_populates="staff")
    targets = relationship("StaffTarget", back_populates="staff")


class Client(Base):
    __tablename__ = "clients"

    client_id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(50), nullable=False)
    address = Column(String(255), nullable=False)
    care_level = Column(String(20), nullable=False)
    service_type = Column(String(20), nullable=False)
    visit_duration = Column(Integer, nullable=False, default=60)
    preferred_time_start = Column(Time, nullable=True)
    requires_two_staff = Column(Boolean, default=False)
    preferred_staff_ids = Column(JSON, default=list)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    service_plans = relationship("ServicePlan", back_populates="client")


class ServicePlan(Base):
    __tablename__ = "service_plans"

    plan_id = Column(String(36), primary_key=True, default=gen_uuid)
    client_id = Column(String(36), ForeignKey("clients.client_id"), nullable=False)
    service_type = Column(String(20), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=60)
    requires_two_staff = Column(Boolean, default=False)
    preferred_time_start = Column(Time, nullable=True)
    preferred_time_end = Column(Time, nullable=True)
    unit_price = Column(Integer, nullable=False, default=2500)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="service_plans")
    visits = relationship("Visit", back_populates="service_plan")


class Route(Base):
    __tablename__ = "routes"

    route_id = Column(String(36), primary_key=True, default=gen_uuid)
    date = Column(Date, nullable=False)
    staff_id = Column(String(36), ForeignKey("staff.staff_id"), nullable=False)
    status = Column(String(20), default=RouteStatusEnum.draft.value)
    total_hours = Column(Float, default=0.0)
    generated_by = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    staff = relationship("Staff", back_populates="routes")
    visits = relationship("Visit", back_populates="route", order_by="Visit.scheduled_start")


class Visit(Base):
    __tablename__ = "visits"

    visit_id = Column(String(36), primary_key=True, default=gen_uuid)
    route_id = Column(String(36), ForeignKey("routes.route_id"), nullable=True)
    plan_id = Column(String(36), ForeignKey("service_plans.plan_id"), nullable=True)
    staff_id = Column(String(36), ForeignKey("staff.staff_id"), nullable=True)
    companion_staff_id = Column(String(36), ForeignKey("staff.staff_id"), nullable=True)
    client_id = Column(String(36), ForeignKey("clients.client_id"), nullable=False)
    scheduled_start = Column(DateTime, nullable=False)
    scheduled_end = Column(DateTime, nullable=False)
    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    service_type = Column(String(20), nullable=False)
    visit_type = Column(String(20), default="normal")
    status = Column(String(10), default=VisitStatusEnum.scheduled.value)
    visit_note = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    route = relationship("Route", back_populates="visits")
    service_plan = relationship("ServicePlan", back_populates="visits")
    staff = relationship("Staff", foreign_keys=[staff_id], back_populates="visits")
    companion_staff = relationship("Staff", foreign_keys=[companion_staff_id])
    client = relationship("Client")
    revenue = relationship("Revenue", back_populates="visit", uselist=False)


class Revenue(Base):
    __tablename__ = "revenues"

    revenue_id = Column(String(36), primary_key=True, default=gen_uuid)
    visit_id = Column(String(36), ForeignKey("visits.visit_id"), nullable=False)
    staff_id = Column(String(36), ForeignKey("staff.staff_id"), nullable=False)
    amount = Column(Integer, nullable=False, default=0)
    service_unit_price = Column(Integer, nullable=False, default=0)
    duration_minutes = Column(Integer, nullable=False, default=0)
    calculated_at = Column(DateTime, default=datetime.utcnow)
    date = Column(Date, nullable=False)

    visit = relationship("Visit", back_populates="revenue")
    staff = relationship("Staff", back_populates="revenues")


class StaffTarget(Base):
    __tablename__ = "staff_targets"

    target_id = Column(String(36), primary_key=True, default=gen_uuid)
    staff_id = Column(String(36), ForeignKey("staff.staff_id"), nullable=False)
    target_type = Column(String(10), nullable=False)
    target_amount = Column(Integer, nullable=False, default=0)
    target_month = Column(String(7), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    staff = relationship("Staff", back_populates="targets")
