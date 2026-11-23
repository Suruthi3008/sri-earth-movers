"""Driver routes. All routes require a valid login token."""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.schemas.driver import DriverIn, DriverOut
from app.services import driver_service

router = APIRouter(prefix="/drivers", tags=["Drivers"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[DriverOut])
def list_drivers() -> list[DriverOut]:
    return driver_service.list_drivers()


@router.post("", response_model=DriverOut, status_code=201)
def create_driver(body: DriverIn) -> DriverOut:
    return driver_service.create_driver(body)


@router.put("/{driver_id}", response_model=DriverOut)
def update_driver(driver_id: str, body: DriverIn) -> DriverOut:
    return driver_service.update_driver(driver_id, body)
