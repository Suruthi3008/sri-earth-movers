"""Payment routes. All routes require a valid login token."""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.schemas.payment import PaymentIn, PaymentOut, PaymentSummary
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["Payments"], dependencies=[Depends(get_current_user)])


# Defined before /{payment_id} so "summary" is not read as an ID
@router.get("/summary", response_model=PaymentSummary)
def payment_summary() -> PaymentSummary:
    return payment_service.summary()


@router.post("", response_model=PaymentOut, status_code=201)
def create_payment(body: PaymentIn) -> PaymentOut:
    return payment_service.record_payment(body)


@router.get("", response_model=list[PaymentOut])
def list_payments() -> list[PaymentOut]:
    return payment_service.list_payments()


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(payment_id: str) -> PaymentOut:
    return payment_service.get_payment(payment_id)
