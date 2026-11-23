"""Driver and driver payment shapes."""
from datetime import date as Date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator

DriverStatus = Literal["Active", "Inactive"]
PaymentType = Literal["Bata", "Salary"]
SalaryStatus = Literal["Paid", "Pending"]


class DriverIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field("", max_length=20)
    salary: Decimal = Field(Decimal("0"), ge=0, le=10_000_000)
    joining_date: Date | None = None
    status: DriverStatus = "Active"


class DriverOut(BaseModel):
    driver_id: str
    name: str
    phone: str = ""
    salary: float = 0
    joining_date: Date | None = None
    status: str = "Active"


class DriverPaymentIn(BaseModel):
    driver_id: str = Field(..., min_length=1, max_length=40)
    payment_type: PaymentType
    date: Date
    month: str | None = Field(None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    amount: Decimal = Field(..., gt=0, le=100_000_000)
    payment_date: Date
    status: SalaryStatus = "Paid"
    notes: str = Field("", max_length=300)

    @model_validator(mode="after")
    def salary_needs_month(self):
        if self.payment_type == "Salary" and not self.month:
            raise ValueError("Choose the salary month.")
        return self


class DriverPaymentStatusIn(BaseModel):
    status: SalaryStatus


class DriverPaymentOut(BaseModel):
    payment_id: str
    driver_id: str
    driver_name: str
    payment_type: str
    date: Date
    month: str | None = None
    amount: float
    payment_date: Date
    status: str
    notes: str = ""


class DriverSummary(BaseModel):
    month_label: str
    bata_this_month: float
    salary_pending: float
    salary_pending_count: int
