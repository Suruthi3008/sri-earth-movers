"""Settings routes. All routes require a valid login token."""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.schemas.settings import SettingsIn
from app.services import settings_service

router = APIRouter(prefix="/settings", tags=["Settings"], dependencies=[Depends(get_current_user)])


@router.get("")
def read_settings() -> dict[str, str]:
    return settings_service.get_all()


@router.put("")
def save_settings(body: SettingsIn) -> dict[str, str]:
    return settings_service.save(body)
