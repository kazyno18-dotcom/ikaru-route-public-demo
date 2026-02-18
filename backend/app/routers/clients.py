from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, require_coordinator_or_above

router = APIRouter(prefix="/api/v1/clients", tags=["clients"])


@router.get("/", response_model=List[schemas.ClientResponse])
def get_clients(
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_coordinator_or_above)
):
    """利用者一覧（コーディネーター以上）"""
    return db.query(models.Client).filter(models.Client.is_active == True).all()


@router.get("/{client_id}", response_model=schemas.ClientResponse)
def get_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_coordinator_or_above)
):
    client = db.query(models.Client).filter(models.Client.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="利用者が見つかりません")
    return client


@router.post("/", response_model=schemas.ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    client_data: schemas.ClientCreate,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_coordinator_or_above)
):
    """利用者登録（コーディネーター以上）"""
    client = models.Client(**client_data.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.put("/{client_id}", response_model=schemas.ClientResponse)
def update_client(
    client_id: str,
    client_data: schemas.ClientUpdate,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_coordinator_or_above)
):
    client = db.query(models.Client).filter(models.Client.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="利用者が見つかりません")

    for key, value in client_data.model_dump(exclude_unset=True).items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_coordinator_or_above)
):
    client = db.query(models.Client).filter(models.Client.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="利用者が見つかりません")
    client.is_active = False
    db.commit()
