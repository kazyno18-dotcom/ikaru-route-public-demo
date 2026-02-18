from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import get_password_hash, require_admin, get_current_user

router = APIRouter(prefix="/api/v1/staff", tags=["staff"])


@router.get("/", response_model=List[schemas.StaffResponse])
def get_staff_list(
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(get_current_user)
):
    """スタッフ一覧取得（全ロール閲覧可）"""
    return db.query(models.Staff).filter(models.Staff.is_active == True).all()


@router.get("/{staff_id}", response_model=schemas.StaffResponse)
def get_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(get_current_user)
):
    staff = db.query(models.Staff).filter(models.Staff.staff_id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="スタッフが見つかりません")
    return staff


@router.post("/", response_model=schemas.StaffResponse, status_code=status.HTTP_201_CREATED)
def create_staff(
    staff_data: schemas.StaffCreate,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_admin)
):
    """スタッフ登録（管理者のみ）"""
    existing = db.query(models.Staff).filter(models.Staff.email == staff_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")

    staff = models.Staff(
        name=staff_data.name,
        email=staff_data.email,
        hashed_password=get_password_hash(staff_data.password),
        role=staff_data.role,
        skill_types=staff_data.skill_types,
        max_hours_day=staff_data.max_hours_day,
        hourly_rate=staff_data.hourly_rate,
        home_address=staff_data.home_address,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


@router.put("/{staff_id}", response_model=schemas.StaffResponse)
def update_staff(
    staff_id: str,
    staff_data: schemas.StaffUpdate,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_admin)
):
    """スタッフ更新（管理者のみ）"""
    staff = db.query(models.Staff).filter(models.Staff.staff_id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="スタッフが見つかりません")

    for key, value in staff_data.model_dump(exclude_unset=True).items():
        setattr(staff, key, value)

    db.commit()
    db.refresh(staff)
    return staff


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_admin)
):
    """スタッフ削除（論理削除・管理者のみ）"""
    staff = db.query(models.Staff).filter(models.Staff.staff_id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="スタッフが見つかりません")
    staff.is_active = False
    db.commit()
