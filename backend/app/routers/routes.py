from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import date, datetime
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, require_coordinator_or_above
from app.optimizer import generate_optimized_routes

router = APIRouter(prefix="/api/v1/routes", tags=["routes"])


@router.get("/", response_model=List[schemas.RouteResponse])
def get_routes(
    target_date: date,
    staff_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(get_current_user)
):
    """日次ルート一覧取得"""
    query = db.query(models.Route).filter(models.Route.date == target_date)

    # staffロールは自分のルートのみ
    if current_user.role == models.RoleEnum.staff:
        query = query.filter(models.Route.staff_id == current_user.staff_id)
    elif staff_id:
        query = query.filter(models.Route.staff_id == staff_id)

    return query.all()


@router.post("/generate", status_code=status.HTTP_202_ACCEPTED)
def generate_routes(
    request: schemas.RouteGenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_coordinator_or_above)
):
    """AIルート自動生成（非同期）"""
    background_tasks.add_task(
        generate_optimized_routes,
        db=db,
        target_date=request.date,
        staff_ids=request.staff_ids
    )
    return {"message": "ルート生成を開始しました", "date": str(request.date)}


@router.post("/", response_model=schemas.RouteResponse, status_code=status.HTTP_201_CREATED)
def create_route(
    route_data: schemas.RouteCreate,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_coordinator_or_above)
):
    """ルート手動作成"""
    route = models.Route(
        date=route_data.date,
        staff_id=route_data.staff_id,
        generated_by="manual"
    )
    db.add(route)
    db.commit()
    db.refresh(route)
    return route


@router.put("/{route_id}/status")
def update_route_status(
    route_id: str,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_coordinator_or_above)
):
    """ルートステータス更新"""
    route = db.query(models.Route).filter(models.Route.route_id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="ルートが見つかりません")
    route.status = new_status
    db.commit()
    return {"message": "ステータスを更新しました"}


@router.get("/progress/{target_date}", response_model=schemas.ProgressResponse)
def get_progress(
    target_date: date,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(get_current_user)
):
    """日次進捗率取得"""
    query = db.query(models.Visit).filter(models.Visit.date == target_date)

    if current_user.role == models.RoleEnum.staff:
        query = query.filter(models.Visit.staff_id == current_user.staff_id)

    visits = query.all()
    total = len(visits)
    completed = sum(1 for v in visits if v.status == models.VisitStatusEnum.completed)
    cancelled = sum(1 for v in visits if v.status == models.VisitStatusEnum.cancelled)

    # スタッフ別進捗
    staff_progress = {}
    for v in visits:
        if v.staff_id:
            sid = str(v.staff_id)
            if sid not in staff_progress:
                staff_progress[sid] = {"total": 0, "completed": 0, "staff_name": ""}
                if v.staff:
                    staff_progress[sid]["staff_name"] = v.staff.name
            staff_progress[sid]["total"] += 1
            if v.status == models.VisitStatusEnum.completed:
                staff_progress[sid]["completed"] += 1

    staff_progress_list = [
        {
            "staff_id": sid,
            "staff_name": data["staff_name"],
            "total": data["total"],
            "completed": data["completed"],
            "rate": round(data["completed"] / data["total"] * 100, 1) if data["total"] > 0 else 0
        }
        for sid, data in staff_progress.items()
    ]

    return schemas.ProgressResponse(
        date=target_date,
        total_visits=total,
        completed_visits=completed,
        cancelled_visits=cancelled,
        progress_rate=round(completed / total * 100, 1) if total > 0 else 0,
        staff_progress=staff_progress_list
    )
