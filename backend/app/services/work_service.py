"""Daily work log and JCB Work summary.

Daily work is a log of what was done and is separate from bills. JCB income
comes only from billed items (Bill_Items), so nothing is counted twice.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from app.schemas.bill import DEFAULT_UNITS
from app.schemas.work import DailyWorkIn, DailyWorkOut, JcbBilledItem, JcbSummary
from app.services.errors import NotFoundError
from app.services.excel_service import get_excel_service
from app.utils.calculations import line_amount, money, to_decimal

DAILY = "Daily_Work"
BILLS = "Bills"
BILL_ITEMS = "Bill_Items"
ZERO = Decimal("0")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _in_month(value: Any, today: date) -> bool:
    parsed = date.fromisoformat(str(value)[:10])
    return parsed.year == today.year and parsed.month == today.month


def _to_out(row: dict[str, Any]) -> DailyWorkOut:
    return DailyWorkOut(
        work_id=row["work_id"],
        date=str(row["date"])[:10],
        customer_name=row.get("customer_name") or "",
        work_type=row.get("work_type") or "",
        description=row.get("description") or "",
        quantity=float(to_decimal(row.get("quantity"))),
        unit=row.get("unit") or "",
        rate=float(money(row.get("rate"))),
        bata=float(money(row.get("bata"))),
        amount=float(money(row.get("amount"))),
        notes=row.get("notes") or "",
        created_at=str(row.get("created_at") or ""),
    )


def _fields(data: DailyWorkIn) -> dict[str, Any]:
    return {
        "date": data.date.isoformat(),
        "customer_name": data.customer_name.strip(),
        "work_type": data.work_type,
        "description": data.description.strip() or data.work_type,
        "quantity": data.quantity,
        "unit": data.unit.strip() or DEFAULT_UNITS[data.work_type],
        "rate": money(data.rate),
        "bata": money(data.bata),
        "amount": line_amount(data.quantity, data.rate, data.bata),
        "notes": data.notes.strip(),
    }


def list_daily(work_type: str | None = None) -> list[DailyWorkOut]:
    rows = get_excel_service().list_rows(DAILY)
    if work_type:
        rows = [r for r in rows if r.get("work_type") == work_type]
    rows.sort(key=lambda r: (str(r.get("date")), str(r.get("created_at") or "")), reverse=True)
    return [_to_out(r) for r in rows]


def get_daily(work_id: str) -> DailyWorkOut:
    row = get_excel_service().get(DAILY, work_id)
    if row is None:
        raise NotFoundError("Work entry not found.")
    return _to_out(row)


def create_daily(data: DailyWorkIn) -> DailyWorkOut:
    row = get_excel_service().create(DAILY, {**_fields(data), "created_at": _now()})
    return _to_out(row)


def update_daily(work_id: str, data: DailyWorkIn) -> DailyWorkOut:
    updated = get_excel_service().update(DAILY, work_id, _fields(data))
    if updated is None:
        raise NotFoundError("Work entry not found.")
    return _to_out(updated)


def delete_daily(work_id: str) -> None:
    if not get_excel_service().delete(DAILY, work_id):
        raise NotFoundError("Work entry not found.")


def jcb_summary(today: date | None = None) -> JcbSummary:
    excel = get_excel_service()
    today = today or date.today()
    bills = {b["bill_id"]: b for b in excel.list_rows(BILLS)}
    jcb_items = [i for i in excel.list_rows(BILL_ITEMS) if i.get("work_type") == "JCB Work"]

    month_items = [i for i in jcb_items if _in_month(i.get("date"), today)]
    hours = sum((to_decimal(i.get("quantity")) for i in month_items), ZERO)
    income = sum((money(i.get("amount")) for i in month_items), ZERO)

    recent_rows = sorted(
        jcb_items,
        key=lambda i: (str(i.get("date")), str(i.get("item_id"))),
        reverse=True,
    )[:10]
    recent = []
    for item in recent_rows:
        bill = bills.get(item.get("bill_id"), {})
        recent.append(
            JcbBilledItem(
                item_id=item["item_id"],
                date=str(item["date"])[:10],
                bill_number=str(bill.get("bill_number") or ""),
                customer_name=bill.get("customer_name") or "",
                quantity=float(to_decimal(item.get("quantity"))),
                unit=item.get("unit") or "hrs",
                amount=float(money(item.get("amount"))),
            )
        )

    return JcbSummary(
        month_label=today.strftime("%b %Y"),
        hours=float(hours),
        income=float(money(income)),
        recent=recent,
    )
