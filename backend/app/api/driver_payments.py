"""Driver payment routes (Bata and Salary). All routes require a valid login token."""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.schemas.driver import DriverPaymentIn, DriverPaymentOut, DriverPaymentStatusIn, DriverSummary
from app.services import driver_service

router = APIRouter(
    prefix="/driver-payments",
    tags=["Driver Payments"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/summary", response_model=DriverSummary)
def payments_summary() -> DriverSummary:
    return driver_service.summary()


@router.get("", response_model=list[DriverPaymentOut])
def list_payments() -> list[DriverPaymentOut]:
    return driver_service.list_payments()


@router.post("", response_model=DriverPaymentOut, status_code=201)
def create_payment(body: DriverPaymentIn) -> DriverPaymentOut:
    return driver_service.create_payment(body)


@router.patch("/{payment_id}", response_model=DriverPaymentOut)
def update_status(payment_id: str, body: DriverPaymentStatusIn) -> DriverPaymentOut:
    return driver_service.update_payment_status(payment_id, body.status)
