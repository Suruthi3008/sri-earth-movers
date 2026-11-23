"""Report and dashboard response shapes."""
from datetime import date as Date

from pydantic import BaseModel

from app.schemas.bill import BillSummary
from app.schemas.expense import ExpenseOut
from app.schemas.payment import PaymentOut


class PeriodOut(BaseModel):
    label: str
    start: Date
    end: Date


class BillsStats(BaseModel):
    count: int
    total_billed: float
    payments_received: float
    pending: float


class IncomeBreakdown(BaseModel):
    jcb_work: float
    lorry_service: float
    tractor_service: float = 0
    other_work: float
    total: float


class ExpenseBreakdown(BaseModel):
    diesel: float
    driver_bata: float
    driver_salary: float
    maintenance: float
    repairs: float
    spare_parts: float
    other: float
    total: float


class MachineExpense(BaseModel):
    name: str
    diesel: float
    maintenance: float  # Vehicle Maintenance + Repairs + Spare Parts
    other: float
    total: float


class ResultOut(BaseModel):
    income: float
    expenses: float
    profit: float


class ReportOut(BaseModel):
    period: PeriodOut
    bills: BillsStats
    income: IncomeBreakdown
    expenses: ExpenseBreakdown
    machines: list[MachineExpense] = []
    result: ResultOut


class DashboardOut(BaseModel):
    month_label: str
    income: float
    payments_received: float
    pending: float
    expenses: float
    profit: float
    income_by_type: IncomeBreakdown
    recent_bills: list[BillSummary]
    recent_payments: list[PaymentOut]
    recent_expenses: list[ExpenseOut]
