from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import date
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, require_coordinator_or_above, require_admin

router = APIRouter(prefix="/api/v1/revenue", tags=["revenue"])


@router.get("/summary/{target_date}", response_model=List[schemas.RevenueSummary])
def get_revenue_summary(
    target_date: date,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_coordinator_or_above)
):
    """
    日次売上サマリー（管理者・コーディネーターのみ）
    権限なしは404を返す（エンドポイントの存在を隠す）
    """
    staff_list = db.query(models.Staff).filter(models.Staff.is_active == True).all()
    result = []

    for staff in staff_list:
        # 当日の売上合計
        revenues = db.query(models.Revenue).filter(
            and_(
                models.Revenue.staff_id == staff.staff_id,
                models.Revenue.date == target_date
            )
        ).all()

        today_revenue = sum(r.amount for r in revenues)
        visit_count = len(revenues)

        # 日次目標取得
        target = db.query(models.StaffTarget).filter(
            and_(
                models.StaffTarget.staff_id == staff.staff_id,
                models.StaffTarget.target_type == "daily"
            )
        ).first()
        target_amount = target.target_amount if target else 0
        achievement_rate = (today_revenue / target_amount * 100) if target_amount > 0 else 0

        result.append(schemas.RevenueSummary(
            staff_id=staff.staff_id,
            staff_name=staff.name,
            today_revenue=today_revenue,
            visit_count=visit_count,
            target_amount=target_amount,
            achievement_rate=round(achievement_rate, 1)
        ))

    return result


@router.get("/detail/{staff_id}/{target_date}", response_model=List[schemas.RevenueDetail])
def get_revenue_detail(
    staff_id: str,
    target_date: date,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_admin)  # 管理者のみ
):
    """売上詳細（管理者のみ）"""
    revenues = db.query(models.Revenue).options(
        joinedload(models.Revenue.visit).joinedload(models.Visit.client)
    ).filter(
        and_(
            models.Revenue.staff_id == staff_id,
            models.Revenue.date == target_date
        )
    ).all()

    result = []
    for r in revenues:
        client_name = r.visit.client.name if r.visit and r.visit.client else "不明"
        service_type = r.visit.service_type if r.visit else "不明"
        result.append(schemas.RevenueDetail(
            revenue_id=r.revenue_id,
            visit_id=r.visit_id,
            client_name=client_name,
            service_type=service_type,
            duration_minutes=r.duration_minutes,
            unit_price=r.service_unit_price,
            amount=r.amount,
            date=r.date
        ))
    return result


@router.post("/targets", response_model=schemas.StaffTargetResponse)
def set_staff_target(
    target_data: schemas.StaffTargetCreate,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_admin)
):
    """売上目標設定（管理者のみ）"""
    existing = db.query(models.StaffTarget).filter(
        and_(
            models.StaffTarget.staff_id == target_data.staff_id,
            models.StaffTarget.target_type == target_data.target_type,
            models.StaffTarget.target_month == target_data.target_month
        )
    ).first()

    if existing:
        existing.target_amount = target_data.target_amount
        db.commit()
        db.refresh(existing)
        return existing

    target = models.StaffTarget(**target_data.model_dump())
    db.add(target)
    db.commit()
    db.refresh(target)
    return target


@router.get("/monthly/{target_month}")
def get_monthly_evaluation(
    target_month: str,  # YYYY-MM
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_admin)
):
    """月次評価サマリー（管理者のみ）"""
    staff_list = db.query(models.Staff).filter(models.Staff.is_active == True).all()
    result = []

    for staff in staff_list:
        # 月間売上
        revenues = db.query(models.Revenue).filter(
            and_(
                models.Revenue.staff_id == staff.staff_id,
                func.to_char(models.Revenue.date, 'YYYY-MM') == target_month
            )
        ).all()

        monthly_revenue = sum(r.amount for r in revenues)
        visit_count = len(revenues)

        # 月次目標
        target = db.query(models.StaffTarget).filter(
            and_(
                models.StaffTarget.staff_id == staff.staff_id,
                models.StaffTarget.target_type == "monthly",
                models.StaffTarget.target_month == target_month
            )
        ).first()
        target_amount = target.target_amount if target else 0
        achievement_rate = (monthly_revenue / target_amount * 100) if target_amount > 0 else 0

        # 稼働時間
        visits = db.query(models.Visit).filter(
            and_(
                models.Visit.staff_id == staff.staff_id,
                func.to_char(models.Visit.date, 'YYYY-MM') == target_month,
                models.Visit.status == models.VisitStatusEnum.completed
            )
        ).all()
        total_minutes = sum(
            int((v.actual_end - v.actual_start).total_seconds() / 60)
            for v in visits if v.actual_start and v.actual_end
        )

        result.append({
            "staff_id": str(staff.staff_id),
            "staff_name": staff.name,
            "monthly_revenue": monthly_revenue,
            "visit_count": visit_count,
            "total_hours": round(total_minutes / 60, 1),
            "target_amount": target_amount,
            "achievement_rate": round(achievement_rate, 1)
        })

    # 売上順でソート
    result.sort(key=lambda x: x["monthly_revenue"], reverse=True)
    for i, item in enumerate(result):
        item["rank"] = i + 1

    return result
