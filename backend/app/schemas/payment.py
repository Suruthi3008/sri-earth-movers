"""Payment request and response shapes."""
from datetime import date as Date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

PaymentMethod = Literal["Cash", "UPI / GPay", "Bank Transfer", "Other"]


class PaymentIn(BaseModel):
    bill_id: str = Field(..., min_length=1, max_length=40)
    payment_date: Date
    amount: Decimal = Field(..., gt=0, le=100_000_000)
    payment_method: PaymentMethod
    reference_number: str = Field("", max_length=60)
    notes: str = Field("", max_length=300)


class PaymentOut(BaseModel):
    payment_id: str
    bill_id: str
    bill_number: str
    customer_name: str
    payment_date: Date
    amount: float
    payment_method: str
    reference_number: str = ""
    notes: str = ""
    created_at: str = ""
    bill_status: str = ""


class PaymentSummary(BaseModel):
    month_label: str
    month_received: float
    pending_collection: float
    unpaid_bills: int
    ledger_bill_amount: float
    ledger_paid: float
    ledger_pending: float
