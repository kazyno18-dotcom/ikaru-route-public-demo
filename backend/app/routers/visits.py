from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List, Optional
from datetime import date, datetime
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, require_coordinator_or_above

router = APIRouter(prefix="/api/v1/visits", tags=["visits"])


@router.get("/", response_model=List[schemas.VisitResponse])
def get_visits(
    target_date: date,
    staff_id: Optional[str] = None,
    unassigned: Optional[bool] = False,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(get_current_user)
):
    """訪問一覧取得"""
    query = db.query(models.Visit).options(
        joinedload(models.Visit.client),
        joinedload(models.Visit.staff),
        joinedload(models.Visit.companion_staff)
    ).filter(models.Visit.date == target_date)

    if current_user.role == models.RoleEnum.staff:
        query = query.filter(models.Visit.staff_id == current_user.staff_id)
    elif staff_id:
        query = query.filter(models.Visit.staff_id == staff_id)

    if unassigned:
        query = query.filter(models.Visit.staff_id == None)

    return query.order_by(models.Visit.scheduled_start).all()


@router.post("/", response_model=schemas.VisitResponse, status_code=status.HTTP_201_CREATED)
def create_visit(
    visit_data: schemas.VisitCreate,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_coordinator_or_above)
):
    """訪問追加"""
    # ダブルブッキングチェック
    if visit_data.staff_id:
        overlap = db.query(models.Visit).filter(
            and_(
                models.Visit.staff_id == visit_data.staff_id,
                models.Visit.date == visit_data.date,
                models.Visit.scheduled_start < visit_data.scheduled_end,
                models.Visit.scheduled_end > visit_data.scheduled_start,
                models.Visit.status != models.VisitStatusEnum.cancelled
            )
        ).first()
        if overlap:
            raise HTTPException(
                status_code=400,
                detail=f"ダブルブッキング: {overlap.scheduled_start.strftime('%H:%M')}〜{overlap.scheduled_end.strftime('%H:%M')}と重複しています"
            )

    visit = models.Visit(**visit_data.model_dump())
    db.add(visit)
    db.commit()
    db.refresh(visit)

    # ルートの合計時間を更新
    if visit.route_id:
        _update_route_total_hours(db, str(visit.route_id))

    return db.query(models.Visit).options(
        joinedload(models.Visit.client),
        joinedload(models.Visit.staff),
        joinedload(models.Visit.companion_staff)
    ).filter(models.Visit.visit_id == visit.visit_id).first()


@router.put("/{visit_id}", response_model=schemas.VisitResponse)
def update_visit(
    visit_id: str,
    visit_data: schemas.VisitUpdate,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(get_current_user)
):
    """訪問更新（実績入力含む）"""
    visit = db.query(models.Visit).filter(models.Visit.visit_id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="訪問が見つかりません")

    # staffロールは自分の訪問のみ更新可
    if current_user.role == models.RoleEnum.staff:
        if str(visit.staff_id) != str(current_user.staff_id):
            raise HTTPException(status_code=403, detail="自分の担当訪問のみ更新できます")
        # staffは実績入力のみ（スケジュール変更不可）
        allowed_fields = {"actual_start", "actual_end", "status", "visit_note"}
        update_data = {k: v for k, v in visit_data.model_dump(exclude_unset=True).items() if k in allowed_fields}
    else:
        update_data = visit_data.model_dump(exclude_unset=True)

    # スタッフ変更時のダブルブッキングチェック
    new_staff_id = update_data.get("staff_id")
    new_start = update_data.get("scheduled_start", visit.scheduled_start)
    new_end = update_data.get("scheduled_end", visit.scheduled_end)

    if new_staff_id and new_staff_id != str(visit.staff_id):
        overlap = db.query(models.Visit).filter(
            and_(
                models.Visit.staff_id == new_staff_id,
                models.Visit.date == visit.date,
                models.Visit.visit_id != visit_id,
                models.Visit.scheduled_start < new_end,
                models.Visit.scheduled_end > new_start,
                models.Visit.status != models.VisitStatusEnum.cancelled
            )
        ).first()
        if overlap:
            raise HTTPException(status_code=400, detail="ダブルブッキングが発生します")

    for key, value in update_data.items():
        setattr(visit, key, value)

    # 完了時に売上を計算
    if visit_data.status == models.VisitStatusEnum.completed and visit.staff_id:
        _calculate_revenue(db, visit)

    db.commit()
    db.refresh(visit)

    if visit.route_id:
        _update_route_total_hours(db, str(visit.route_id))

    return db.query(models.Visit).options(
        joinedload(models.Visit.client),
        joinedload(models.Visit.staff),
        joinedload(models.Visit.companion_staff)
    ).filter(models.Visit.visit_id == visit_id).first()


@router.delete("/{visit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_visit(
    visit_id: str,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_coordinator_or_above)
):
    visit = db.query(models.Visit).filter(models.Visit.visit_id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="訪問が見つかりません")
    db.delete(visit)
    db.commit()


def _update_route_total_hours(db: Session, route_id: str):
    """ルートの合計稼働時間を再計算"""
    visits = db.query(models.Visit).filter(
        and_(
            models.Visit.route_id == route_id,
            models.Visit.status != models.VisitStatusEnum.cancelled
        )
    ).all()
    total_minutes = sum(
        (v.scheduled_end - v.scheduled_start).total_seconds() / 60
        for v in visits
    )
    route = db.query(models.Route).filter(models.Route.route_id == route_id).first()
    if route:
        route.total_hours = round(total_minutes / 60, 2)
        db.commit()


def _calculate_revenue(db: Session, visit: models.Visit):
    """訪問完了時の売上計算"""
    if not visit.actual_start or not visit.actual_end:
        return

    duration_minutes = int((visit.actual_end - visit.actual_start).total_seconds() / 60)

    # サービス単価をケアプランから取得（なければデフォルト）
    unit_price = 2500
    if visit.plan_id:
        plan = db.query(models.ServicePlan).filter(models.ServicePlan.plan_id == visit.plan_id).first()
        if plan:
            unit_price = plan.unit_price

    amount = int(duration_minutes / 60 * unit_price)

    # 既存売上レコードを更新 or 新規作成
    existing = db.query(models.Revenue).filter(models.Revenue.visit_id == visit.visit_id).first()
    if existing:
        existing.amount = amount
        existing.duration_minutes = duration_minutes
        existing.unit_price = unit_price
    else:
        revenue = models.Revenue(
            visit_id=visit.visit_id,
            staff_id=visit.staff_id,
            amount=amount,
            service_unit_price=unit_price,
            duration_minutes=duration_minutes,
            date=visit.date
        )
        db.add(revenue)

    # 2人体制の場合、同行スタッフにも売上計上
    if visit.companion_staff_id and visit.visit_type == "two_staff":
        companion_rev = db.query(models.Revenue).filter(
            and_(
                models.Revenue.visit_id == visit.visit_id,
                models.Revenue.staff_id == visit.companion_staff_id
            )
        ).first()
        if not companion_rev:
            companion_revenue = models.Revenue(
                visit_id=visit.visit_id,
                staff_id=visit.companion_staff_id,
                amount=amount,
                service_unit_price=unit_price,
                duration_minutes=duration_minutes,
                date=visit.date
            )
            db.add(companion_revenue)
