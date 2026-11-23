"""Report routes. All routes require a valid login token."""
from datetime import date as Date

from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from app.schemas.report import ReportOut
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["Reports"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=ReportOut)
def get_report(
    preset: str = Query("month", pattern="^(today|week|month|year|custom)$"),
    start: Date | None = Query(None),
    end: Date | None = Query(None),
) -> ReportOut:
    return report_service.get_report(preset, start, end)
