"""Drivers, Bata and Salary.

Driver payments are recorded only here. The Expenses page rejects these
categories, so each rupee is counted once. Paid driver payments are added to
total expenses in Reports using the Driver_Payments sheet.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from app.schemas.driver import DriverIn, DriverOut, DriverPaymentIn, DriverPaymentOut, DriverSummary
from app.services.errors import BusinessRuleError, NotFoundError
from app.services.excel_service import get_excel_service
from app.utils.calculations import money

DRIVERS = "Drivers"
DRIVER_PAYMENTS = "Driver_Payments"
ZERO = Decimal("0")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _date_or_none(value: Any) -> str | None:
    return str(value)[:10] if value else None


def _in_month(value: Any, today: date) -> bool:
    parsed = date.fromisoformat(str(value)[:10])
    return parsed.year == today.year and parsed.month == today.month


# ---------------------------------------------------------------- drivers

def _driver_out(row: dict[str, Any]) -> DriverOut:
    return DriverOut(
        driver_id=row["driver_id"],
        name=row.get("name") or "",
        phone=row.get("phone") or "",
        salary=float(money(row.get("salary"))),
        joining_date=_date_or_none(row.get("joining_date")),
        status=row.get("status") or "Active",
    )


def _driver_fields(data: DriverIn) -> dict[str, Any]:
    return {
        "name": data.name.strip(),
        "phone": data.phone.strip(),
        "salary": money(data.salary),
        "joining_date": data.joining_date.isoformat() if data.joining_date else "",
        "status": data.status,
    }


def list_drivers() -> list[DriverOut]:
    rows = get_excel_service().list_rows(DRIVERS)
    rows.sort(key=lambda r: str(r.get("name") or "").lower())
    return [_driver_out(r) for r in rows]


def create_driver(data: DriverIn) -> DriverOut:
    row = get_excel_service().create(DRIVERS, _driver_fields(data))
    return _driver_out(row)


def update_driver(driver_id: str, data: DriverIn) -> DriverOut:
    updated = get_excel_service().update(DRIVERS, driver_id, _driver_fields(data))
    if updated is None:
        raise NotFoundError("Driver not found.")
    return _driver_out(updated)


# ---------------------------------------------------------------- payments

def _payment_out(row: dict[str, Any]) -> DriverPaymentOut:
    return DriverPaymentOut(
        payment_id=row["payment_id"],
        driver_id=row.get("driver_id") or "",
        driver_name=row.get("driver_name") or "",
        payment_type=row.get("payment_type") or "",
        date=str(row.get("date"))[:10],
        month=row.get("month") or None,
        amount=float(money(row.get("amount"))),
        payment_date=str(row.get("payment_date"))[:10],
        status=row.get("status") or "Paid",
        notes=row.get("notes") or "",
    )


def list_payments(limit: int = 50) -> list[DriverPaymentOut]:
    rows = get_excel_service().list_rows(DRIVER_PAYMENTS)
    rows.sort(key=lambda r: (str(r.get("payment_date")), str(r.get("created_at") or "")), reverse=True)
    return [_payment_out(r) for r in rows[:limit]]


def create_payment(data: DriverPaymentIn) -> DriverPaymentOut:
    excel = get_excel_service()
    driver = excel.get(DRIVERS, data.driver_id)
    if driver is None:
        raise NotFoundError("Driver not found.")
    if driver.get("status") != "Active":
        raise BusinessRuleError("This driver is inactive. Make the driver active to record a payment.")

    is_bata = data.payment_type == "Bata"
    row = excel.create(
        DRIVER_PAYMENTS,
        {
            "driver_id": data.driver_id,
            "driver_name": driver.get("name"),
            "payment_type": data.payment_type,
            "date": data.date.isoformat(),
            "month": data.date.strftime("%Y-%m") if is_bata else data.month,
            "amount": money(data.amount),
            "payment_date": data.payment_date.isoformat(),
            "status": "Paid" if is_bata else data.status,
            "notes": data.notes.strip(),
            "created_at": _now(),
        },
    )
    return _payment_out(row)


def update_payment_status(payment_id: str, status: str) -> DriverPaymentOut:
    excel = get_excel_service()
    row = excel.get(DRIVER_PAYMENTS, payment_id)
    if row is None:
        raise NotFoundError("Payment not found.")
    if row.get("payment_type") != "Salary":
        raise BusinessRuleError("Only salary payments have a status to change.")

    updated = excel.update(DRIVER_PAYMENTS, payment_id, {"status": status})
    return _payment_out(updated)


def paid_total_between(start: date, end: date) -> Decimal:
    """Paid Bata and Salary with a payment date in [start, end]."""
    total = ZERO
    for row in get_excel_service().list_rows(DRIVER_PAYMENTS):
        if (row.get("status") or "Paid") != "Paid":
            continue
        paid_on = date.fromisoformat(str(row.get("payment_date"))[:10])
        if start <= paid_on <= end:
            total += money(row.get("amount"))
    return money(total)


def summary(today: date | None = None) -> DriverSummary:
    today = today or date.today()
    rows = get_excel_service().list_rows(DRIVER_PAYMENTS)

    bata = sum(
        (money(r.get("amount")) for r in rows
         if r.get("payment_type") == "Bata" and _in_month(r.get("date"), today)),
        ZERO,
    )
    pending = [r for r in rows if r.get("payment_type") == "Salary" and r.get("status") == "Pending"]
    pending_total = sum((money(r.get("amount")) for r in pending), ZERO)

    return DriverSummary(
        month_label=today.strftime("%b %Y"),
        bata_this_month=float(money(bata)),
        salary_pending=float(money(pending_total)),
        salary_pending_count=len(pending),
    )
