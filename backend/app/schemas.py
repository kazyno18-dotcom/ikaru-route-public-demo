from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date, time
from uuid import UUID
from app.models import RoleEnum, ServiceTypeEnum, VisitStatusEnum, RouteStatusEnum, CareLevelEnum


# ===== 認証スキーマ =====
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    staff_id: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ===== スタッフスキーマ =====
class StaffBase(BaseModel):
    name: str = Field(..., max_length=50)
    email: str
    role: RoleEnum
    skill_types: List[str] = []
    max_hours_day: float = Field(8.0, ge=0.5, le=24.0)
    hourly_rate: int = Field(1000, ge=0, le=99999)
    home_address: Optional[str] = None


class StaffCreate(StaffBase):
    password: str


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[RoleEnum] = None
    skill_types: Optional[List[str]] = None
    max_hours_day: Optional[float] = None
    hourly_rate: Optional[int] = None
    home_address: Optional[str] = None
    is_active: Optional[bool] = None


class StaffResponse(StaffBase):
    staff_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ===== 利用者スキーマ =====
class ClientBase(BaseModel):
    name: str = Field(..., max_length=50)
    address: str
    care_level: CareLevelEnum
    service_type: ServiceTypeEnum
    visit_duration: int = Field(60, description="分")
    preferred_time_start: Optional[str] = None
    requires_two_staff: bool = False
    preferred_staff_ids: List[str] = []
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    care_level: Optional[CareLevelEnum] = None
    service_type: Optional[ServiceTypeEnum] = None
    visit_duration: Optional[int] = None
    preferred_time_start: Optional[str] = None
    requires_two_staff: Optional[bool] = None
    preferred_staff_ids: Optional[List[str]] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ClientResponse(ClientBase):
    client_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ===== ケアプランスキーマ =====
class ServicePlanCreate(BaseModel):
    client_id: UUID
    service_type: ServiceTypeEnum
    duration_minutes: int = 60
    requires_two_staff: bool = False
    preferred_time_start: Optional[str] = None
    preferred_time_end: Optional[str] = None
    unit_price: int = 2500


class ServicePlanResponse(ServicePlanCreate):
    plan_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ===== 訪問スキーマ =====
class VisitCreate(BaseModel):
    client_id: UUID
    staff_id: Optional[UUID] = None
    companion_staff_id: Optional[UUID] = None
    scheduled_start: datetime
    scheduled_end: datetime
    service_type: ServiceTypeEnum
    visit_type: str = "normal"
    visit_note: Optional[str] = Field(None, max_length=500)
    date: date
    plan_id: Optional[UUID] = None


class VisitUpdate(BaseModel):
    staff_id: Optional[UUID] = None
    companion_staff_id: Optional[UUID] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    status: Optional[VisitStatusEnum] = None
    visit_note: Optional[str] = None
    visit_type: Optional[str] = None
    route_id: Optional[UUID] = None


class ClientSummary(BaseModel):
    client_id: UUID
    name: str
    address: str
    service_type: str

    class Config:
        from_attributes = True


class StaffSummary(BaseModel):
    staff_id: UUID
    name: str
    role: str

    class Config:
        from_attributes = True


class VisitResponse(BaseModel):
    visit_id: UUID
    client_id: UUID
    staff_id: Optional[UUID]
    companion_staff_id: Optional[UUID]
    route_id: Optional[UUID]
    scheduled_start: datetime
    scheduled_end: datetime
    actual_start: Optional[datetime]
    actual_end: Optional[datetime]
    service_type: str
    visit_type: str
    status: str
    visit_note: Optional[str]
    date: date
    client: Optional[ClientSummary] = None
    staff: Optional[StaffSummary] = None
    companion_staff: Optional[StaffSummary] = None

    class Config:
        from_attributes = True


# ===== ルートスキーマ =====
class RouteCreate(BaseModel):
    date: date
    staff_id: UUID


class RouteGenerateRequest(BaseModel):
    date: date
    staff_ids: Optional[List[UUID]] = None


class RouteResponse(BaseModel):
    route_id: UUID
    date: date
    staff_id: UUID
    status: str
    total_hours: float
    generated_by: Optional[str]
    visits: List[VisitResponse] = []
    staff: Optional[StaffSummary] = None

    class Config:
        from_attributes = True


# ===== 売上スキーマ =====
class RevenueSummary(BaseModel):
    staff_id: UUID
    staff_name: str
    today_revenue: int
    visit_count: int
    target_amount: int
    achievement_rate: float


class RevenueDetail(BaseModel):
    revenue_id: UUID
    visit_id: UUID
    client_name: str
    service_type: str
    duration_minutes: int
    unit_price: int
    amount: int
    date: date

    class Config:
        from_attributes = True


# ===== 目標スキーマ =====
class StaffTargetCreate(BaseModel):
    staff_id: UUID
    target_type: str  # "daily" or "monthly"
    target_amount: int
    target_month: Optional[str] = None  # YYYY-MM


class StaffTargetResponse(StaffTargetCreate):
    target_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ===== 進捗スキーマ =====
class ProgressResponse(BaseModel):
    date: date
    total_visits: int
    completed_visits: int
    cancelled_visits: int
    progress_rate: float
    staff_progress: List[dict] = []
