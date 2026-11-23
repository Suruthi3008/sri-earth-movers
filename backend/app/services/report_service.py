"""Reports and dashboard figures. Every number is calculated from stored records.

Definitions:
- Income: billed amount of bills dated in the period, by work type.
- Expenses: Expenses sheet rows dated in the period, plus Paid driver payments
  whose payment date is in the period. Driver costs are not in the Expenses
  sheet, so nothing is counted twice.
- Machine breakdown: the same expense rows, grouped by JCB2012 / JCB2022.
  It is a view of total expenses, not an addition to them.
- Profit: Income − Expenses.
- Payments received: money actually received in the period, for any bill.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from app.schemas.report import (
    BillsStats,
    DashboardOut,
    ExpenseBreakdown,
    IncomeBreakdown,
    MachineExpense,
    PeriodOut,
    ReportOut,
    ResultOut,
)
from app.services import bill_service, expense_service, payment_service
from app.services.excel_service import get_excel_service
from app.utils.calculations import money, pending_amount
from app.utils.dates import resolve_range

BILLS = "Bills"
ITEMS = "Bill_Items"
PAYMENTS = "Payments"
EXPENSES = "Expenses"
DRIVER_PAYMENTS = "Driver_Payments"
MACHINES = ("JCB2012", "JCB2022")
ZERO = Decimal("0")

EXPENSE_KEYS = {
    "Diesel": "diesel",
    "Vehicle Maintenance": "maintenance",
    "Repairs": "repairs",
    "Spare Parts": "spare_parts",
    "Other Expenses": "other",
}
MAINTENANCE_KEYS = {"maintenance", "repairs", "spare_parts"}


def _within(value: Any, start: date, end: date) -> bool:
    try:
        day = date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return False
    return start <= day <= end


def _f(value: Decimal) -> float:
    return float(money(value))


def build_report(start: date, end: date, label: str) -> ReportOut:
    excel = get_excel_service()
    bills = excel.list_rows(BILLS)
    payments = excel.list_rows(PAYMENTS)

    paid_by_bill: dict[str, Decimal] = {}
    for payment in payments:
        bill_id = payment.get("bill_id")
        if bill_id:
            paid_by_bill[bill_id] = paid_by_bill.get(bill_id, ZERO) + money(payment.get("amount"))

    period_bills = [b for b in bills if _within(b.get("bill_date"), start, end)]
    period_ids = {b["bill_id"] for b in period_bills}
    total_billed = sum((money(b.get("total_amount")) for b in period_bills), ZERO)
    total_pending = sum(
        (pending_amount(money(b.get("total_amount")), paid_by_bill.get(b["bill_id"], ZERO))
         for b in period_bills),
        ZERO,
    )
    received = sum(
        (money(p.get("amount")) for p in payments if _within(p.get("payment_date"), start, end)),
        ZERO,
    )

    income: dict[str, Decimal] = {
        "JCB Work": ZERO, "Lorry Service": ZERO, "Tractor Service": ZERO, "Other Work": ZERO,
    }
    for item in excel.list_rows(ITEMS):
        if item.get("bill_id") in period_ids:
            work_type = item.get("work_type")
            income[work_type] = income.get(work_type, ZERO) + money(item.get("amount"))
    income_total = sum(income.values(), ZERO)

    expense: dict[str, Decimal] = {key: ZERO for key in (
        "diesel", "driver_bata", "driver_salary", "maintenance", "repairs", "spare_parts", "other",
    )}
    machine_totals = {m: {"diesel": ZERO, "maintenance": ZERO, "other": ZERO} for m in MACHINES}

    for row in excel.list_rows(EXPENSES):
        if not _within(row.get("date"), start, end):
            continue
        amount = money(row.get("amount"))
        key = EXPENSE_KEYS.get(row.get("category"), "other")
        expense[key] += amount

        machine = row.get("machine") or "General"
        if machine in machine_totals:
            if key == "diesel":
                bucket = "diesel"
            elif key in MAINTENANCE_KEYS:
                bucket = "maintenance"
            else:
                bucket = "other"
            machine_totals[machine][bucket] += amount

    for row in excel.list_rows(DRIVER_PAYMENTS):
        if (row.get("status") or "Paid") != "Paid" or not _within(row.get("payment_date"), start, end):
            continue
        if row.get("payment_type") == "Bata":
            expense["driver_bata"] += money(row.get("amount"))
        elif row.get("payment_type") == "Salary":
            expense["driver_salary"] += money(row.get("amount"))
    expense_total = sum(expense.values(), ZERO)

    machines = [
        MachineExpense(
            name=name,
            diesel=_f(v["diesel"]),
            maintenance=_f(v["maintenance"]),
            other=_f(v["other"]),
            total=_f(v["diesel"] + v["maintenance"] + v["other"]),
        )
        for name, v in machine_totals.items()
    ]

    return ReportOut(
        period=PeriodOut(label=label, start=start, end=end),
        bills=BillsStats(
            count=len(period_bills),
            total_billed=_f(total_billed),
            payments_received=_f(received),
            pending=_f(total_pending),
        ),
        income=IncomeBreakdown(
            jcb_work=_f(income["JCB Work"]),
            lorry_service=_f(income["Lorry Service"]),
            tractor_service=_f(income["Tractor Service"]),
            other_work=_f(income["Other Work"]),
            total=_f(income_total),
        ),
        expenses=ExpenseBreakdown(
            diesel=_f(expense["diesel"]),
            driver_bata=_f(expense["driver_bata"]),
            driver_salary=_f(expense["driver_salary"]),
            maintenance=_f(expense["maintenance"]),
            repairs=_f(expense["repairs"]),
            spare_parts=_f(expense["spare_parts"]),
            other=_f(expense["other"]),
            total=_f(expense_total),
        ),
        machines=machines,
        result=ResultOut(
            income=_f(income_total),
            expenses=_f(expense_total),
            profit=_f(income_total - expense_total),
        ),
    )


def get_report(preset: str, start: date | None, end: date | None, today: date | None = None) -> ReportOut:
    s, e, label = resolve_range(preset, today or date.today(), start, end)
    return build_report(s, e, label)


def build_dashboard(today: date | None = None) -> DashboardOut:
    today = today or date.today()
    start, end, label = resolve_range("month", today)
    report = build_report(start, end, label)

    return DashboardOut(
        month_label=label,
        income=report.income.total,
        payments_received=report.bills.payments_received,
        pending=payment_service.summary(today).pending_collection,
        expenses=report.expenses.total,
        profit=report.result.profit,
        income_by_type=report.income,
        recent_bills=bill_service.list_bills()[:5],
        recent_payments=payment_service.list_payments(5),
        recent_expenses=expense_service.list_expenses()[:5],
    )
