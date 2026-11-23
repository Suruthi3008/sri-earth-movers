"""Expense request and response shapes."""
from datetime import date as Date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.payment import PaymentMethod

# Driver Bata and Driver Salary are recorded in Driver Payments, not here
ExpenseCategory = Literal["Diesel", "Vehicle Maintenance", "Repairs", "Spare Parts", "Other Expenses"]
ExpenseMachine = Literal["General", "JCB2012", "JCB2022"]


class ExpenseIn(BaseModel):
    date: Date
    category: ExpenseCategory
    machine: ExpenseMachine = "General"
    description: str = Field("", max_length=200)
    amount: Decimal = Field(..., gt=0, le=100_000_000)
    payment_method: PaymentMethod
    notes: str = Field("", max_length=300)


class ExpenseOut(BaseModel):
    expense_id: str
    date: Date
    category: str
    machine: str = "General"
    description: str
    amount: float
    payment_method: str
    notes: str
    created_at: str
