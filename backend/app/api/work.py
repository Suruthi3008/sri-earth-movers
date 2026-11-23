"""Daily work and JCB Work routes. All routes require a valid login token."""
from fastapi import APIRouter, Depends, Query, Response

from app.core.security import get_current_user
from app.schemas.work import DailyWorkIn, DailyWorkOut, JcbSummary
from app.services import work_service

router = APIRouter(prefix="/daily-work", tags=["Daily Work"], dependencies=[Depends(get_current_user)])
jcb_router = APIRouter(prefix="/jcb-work", tags=["JCB Work"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[DailyWorkOut])
def list_daily(work_type: str | None = Query(None, max_length=30)) -> list[DailyWorkOut]:
    return work_service.list_daily(work_type)


@router.post("", response_model=DailyWorkOut, status_code=201)
def create_daily(body: DailyWorkIn) -> DailyWorkOut:
    return work_service.create_daily(body)


@router.get("/{work_id}", response_model=DailyWorkOut)
def get_daily(work_id: str) -> DailyWorkOut:
    return work_service.get_daily(work_id)


@router.put("/{work_id}", response_model=DailyWorkOut)
def update_daily(work_id: str, body: DailyWorkIn) -> DailyWorkOut:
    return work_service.update_daily(work_id, body)


@router.delete("/{work_id}", status_code=204)
def delete_daily(work_id: str) -> Response:
    work_service.delete_daily(work_id)
    return Response(status_code=204)


@jcb_router.get("", response_model=JcbSummary)
def jcb_summary() -> JcbSummary:
    return work_service.jcb_summary()
