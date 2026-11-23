"""Request and response shapes for bills."""
from datetime import date as Date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

WorkType = Literal["JCB Work", "Lorry Service", "Tractor Service", "Other Work"]

LORRY_MATERIALS: list[str] = [
    "M Sand", "P Sand", "Hill Soil", "Gravel Soil", "Lake Soil", "1/2 Stone", "1/4 Stone", "Black Stone",
]
LORRY_UNITS: list[str] = ["Ton", "Unit", "CFT", "Load"]
TRACTOR_UNITS: list[str] = ["Hours", "Trip", "Load"]

UNIT_OPTIONS: dict[str, list[str]] = {
    "JCB Work": ["hrs", "day"],
    "Lorry Service": LORRY_UNITS,
    "Tractor Service": TRACTOR_UNITS,
    "Other Work": ["job"],
}

DEFAULT_UNITS: dict[str, str] = {
    "JCB Work": "hrs",
    "Lorry Service": "Load",
    "Tractor Service": "Hours",
    "Other Work": "job",
}


class WorkItemIn(BaseModel):
    date: Date
    work_type: WorkType
    material: str = Field("", max_length=40)  # Lorry Service only
    description: str = Field("", max_length=200)
    quantity: Decimal = Field(..., gt=0, le=100000)
    unit: str = Field("", max_length=20)
    rate: Decimal = Field(..., ge=0, le=10_000_000)
    bata: Decimal = Field(Decimal("0"), ge=0, le=10_000_000)

    @model_validator(mode="after")
    def check_options(self):
        if self.work_type == "Lorry Service" and self.material not in LORRY_MATERIALS:
            raise ValueError("Choose a material for Lorry Service.")
        allowed = UNIT_OPTIONS[self.work_type]
        if self.unit and self.unit not in allowed:
            raise ValueError(f"Unit must be one of: {', '.join(allowed)}.")
        return self


class BillIn(BaseModel):
    bill_date: Date
    customer_name: str = Field(..., min_length=1, max_length=120)
    customer_address: str = Field("", max_length=300)
    project_name: str = Field("", max_length=120)
    advance: Decimal = Field(Decimal("0"), ge=0, le=100_000_000)
    old_balance: Decimal = Field(Decimal("0"), ge=0, le=100_000_000)
    items: list[WorkItemIn] = Field(..., min_length=1, max_length=50)

    @field_validator("customer_name")
    @classmethod
    def customer_name_required(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Customer name is required.")
        return value


class WorkItemOut(BaseModel):
    item_id: str
    date: Date
    work_type: str
    description: str
    quantity: float
    quantity_display: str = ""
    unit: str
    rate: float
    base: float = 0  # quantity × rate, or the minimum charge
    bata: float
    amount: float


class BillSummary(BaseModel):
    bill_id: str
    bill_number: str
    bill_date: Date
    customer_name: str
    project_name: str = ""
    total_amount: float
    total_paid: float
    pending_amount: float
    status: str


class BillOut(BillSummary):
    customer_address: str = ""
    advance: float = 0
    old_balance: float = 0
    total_balance: float = 0  # work total + old balance - advance
    items: list[WorkItemOut]
    created_at: str = ""
    updated_at: str = ""
