"""Daily work and JCB Work shapes."""
from datetime import date as Date
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.schemas.bill import WorkType


class DailyWorkIn(BaseModel):
    date: Date
    customer_name: str = Field(..., min_length=1, max_length=120)
    work_type: WorkType
    description: str = Field("", max_length=200)
    quantity: Decimal = Field(..., gt=0, le=100000)
    unit: str = Field("", max_length=20)
    rate: Decimal = Field(..., ge=0, le=10_000_000)
    bata: Decimal = Field(Decimal("0"), ge=0, le=10_000_000)
    notes: str = Field("", max_length=300)

    @field_validator("customer_name")
    @classmethod
    def customer_required(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Customer name is required.")
        return value


class DailyWorkOut(BaseModel):
    work_id: str
    date: Date
    customer_name: str
    work_type: str
    description: str
    quantity: float
    unit: str
    rate: float
    bata: float
    amount: float
    notes: str = ""
    created_at: str = ""


class JcbBilledItem(BaseModel):
    item_id: str
    date: Date
    bill_number: str
    customer_name: str
    quantity: float
    unit: str
    amount: float


class JcbSummary(BaseModel):
    month_label: str
    hours: float
    income: float
    recent: list[JcbBilledItem]
