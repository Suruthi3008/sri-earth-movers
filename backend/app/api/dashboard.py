"""Dashboard route. Requires a valid login token."""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.schemas.report import DashboardOut
from app.services import report_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=DashboardOut)
def dashboard() -> DashboardOut:
    return report_service.build_dashboard()
