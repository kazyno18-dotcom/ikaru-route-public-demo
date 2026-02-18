from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app import models
from app.auth import require_coordinator_or_above, require_admin
from app.excel_export import generate_route_excel

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.get("/excel/{target_date}")
def download_route_excel(
    target_date: date,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(require_coordinator_or_above)
):
    """日次ルート表Excelダウンロード"""
    include_revenue = current_user.role in [models.RoleEnum.admin, models.RoleEnum.coordinator]

    excel_buffer = generate_route_excel(db, target_date, include_revenue=include_revenue)

    filename = f"ikaruRoute_{target_date.strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
