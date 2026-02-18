from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app import models

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.Staff:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証情報が無効です",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        staff_id: str = payload.get("sub")
        if staff_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    staff = db.query(models.Staff).filter(
        models.Staff.staff_id == staff_id,
        models.Staff.is_active == True
    ).first()
    if staff is None:
        raise credentials_exception
    return staff


def require_admin(current_user: models.Staff = Depends(get_current_user)) -> models.Staff:
    if current_user.role != models.RoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者権限が必要です"
        )
    return current_user


def require_coordinator_or_above(current_user: models.Staff = Depends(get_current_user)) -> models.Staff:
    if current_user.role not in [models.RoleEnum.admin, models.RoleEnum.coordinator]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="コーディネーター以上の権限が必要です"
        )
    return current_user
