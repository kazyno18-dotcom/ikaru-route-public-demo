from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    """ログイン（JWT発行）"""
    staff = db.query(models.Staff).filter(
        models.Staff.email == login_data.email,
        models.Staff.is_active == True
    ).first()

    if not staff or not verify_password(login_data.password, staff.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません"
        )

    access_token = create_access_token(data={
        "sub": str(staff.staff_id),
        "role": staff.role,
        "name": staff.name
    })

    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
        role=staff.role,
        staff_id=str(staff.staff_id),
        name=staff.name
    )


@router.get("/me", response_model=schemas.StaffResponse)
def get_me(current_user: models.Staff = Depends(get_current_user)):
    """現在のユーザー情報取得"""
    return current_user
