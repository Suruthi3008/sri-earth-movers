"""Payment rules: validation, saving, keeping Bills totals in sync, and the summary.

The Payments sheet is the source of truth. The paid, pending and status columns
on the Bills sheet are kept in sync after every payment.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from app.schemas.payment import PaymentIn, PaymentOut, PaymentSummary
from app.services.errors import BusinessRuleError, NotFoundError
from app.services.excel_service import get_excel_service
from app.utils.calculations import bill_status, money, pending_amount

BILLS = "Bills"
PAYMENTS = "Payments"
ZERO = Decimal("0")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _is_same_month(value: Any, today: date) -> bool:
    parsed = date.fromisoformat(str(value)[:10])
    return parsed.year == today.year and parsed.month == today.month


def _paid_map(payments: list[dict[str, Any]]) -> dict[str, Decimal]:
    totals: dict[str, Decimal] = {}
    for payment in payments:
        bill_id = payment.get("bill_id")
        if bill_id:
            totals[bill_id] = totals.get(bill_id, ZERO) + money(payment.get("amount"))
    return totals


def _to_out(record: dict[str, Any], status: str) -> PaymentOut:
    return PaymentOut(
        payment_id=record["payment_id"],
        bill_id=record["bill_id"],
        bill_number=str(record.get("bill_number") or ""),
        customer_name=record.get("customer_name") or "",
        payment_date=str(record["payment_date"])[:10],
        amount=float(money(record.get("amount"))),
        payment_method=record.get("payment_method") or "",
        reference_number=record.get("reference_number") or "",
        notes=record.get("notes") or "",
        created_at=str(record.get("created_at") or ""),
        bill_status=status,
    )


def sync_bill(bill_id: str) -> dict[str, Any]:
    """Recalculate paid, pending and status on the Bills sheet from Payments."""
    excel = get_excel_service()
    bill = excel.get(BILLS, bill_id)
    if bill is None:
        raise NotFoundError("Bill not found.")

    total = money(bill.get("total_amount"))
    paid = _paid_map(excel.list_rows(PAYMENTS)).get(bill_id, ZERO)
    updated = excel.update(
        BILLS,
        bill_id,
        {
            "total_paid": paid,
            "pending_amount": pending_amount(total, paid),
            "status": bill_status(total, paid),
            "updated_at": _now(),
        },
    )
    return updated or bill


def record_payment(data: PaymentIn) -> PaymentOut:
    excel = get_excel_service()
    bill = excel.get(BILLS, data.bill_id)
    if bill is None:
        raise NotFoundError("Bill not found.")

    total = money(bill.get("total_amount"))
    paid_before = _paid_map(excel.list_rows(PAYMENTS)).get(data.bill_id, ZERO)
    pending_before = pending_amount(total, paid_before)
    amount = money(data.amount)

    if pending_before <= 0:
        raise BusinessRuleError("This bill is already fully paid.")
    if amount > pending_before:
        raise BusinessRuleError(
            f"The amount is more than the pending balance of ₹{pending_before:,.2f}."
        )

    record = excel.create(
        PAYMENTS,
        {
            "bill_id": data.bill_id,
            "bill_number": str(bill.get("bill_number")),
            "customer_name": bill.get("customer_name"),
            "payment_date": data.payment_date.isoformat(),
            "amount": amount,
            "payment_method": data.payment_method,
            "reference_number": data.reference_number.strip(),
            "notes": data.notes.strip(),
            "created_at": _now(),
        },
    )
    updated_bill = sync_bill(data.bill_id)
    return _to_out(record, updated_bill.get("status") or "")


def list_payments(limit: int = 30) -> list[PaymentOut]:
    excel = get_excel_service()
    status_by_bill = {b["bill_id"]: b.get("status") or "" for b in excel.list_rows(BILLS)}
    rows = sorted(
        excel.list_rows(PAYMENTS),
        key=lambda r: (str(r.get("payment_date")), str(r.get("created_at") or "")),
        reverse=True,
    )
    return [_to_out(r, status_by_bill.get(r.get("bill_id"), "")) for r in rows[:limit]]


def get_payment(payment_id: str) -> PaymentOut:
    excel = get_excel_service()
    record = excel.get(PAYMENTS, payment_id)
    if record is None:
        raise NotFoundError("Payment not found.")
    bill = excel.get(BILLS, record["bill_id"]) or {}
    return _to_out(record, bill.get("status") or "")


def summary(today: date | None = None) -> PaymentSummary:
    excel = get_excel_service()
    today = today or date.today()
    bills = excel.list_rows(BILLS)
    payments = excel.list_rows(PAYMENTS)
    paid_by_bill = _paid_map(payments)

    month_received = sum(
        (money(p.get("amount")) for p in payments if _is_same_month(p.get("payment_date"), today)),
        ZERO,
    )

    pending_collection = ZERO
    unpaid = 0
    ledger_bill = ZERO
    ledger_paid = ZERO
    for bill in bills:
        total = money(bill.get("total_amount"))
        paid = paid_by_bill.get(bill["bill_id"], ZERO)
        pending = pending_amount(total, paid)
        if pending > 0:
            pending_collection += pending
            unpaid += 1
        if _is_same_month(bill.get("bill_date"), today):
            ledger_bill += total
            ledger_paid += paid

    return PaymentSummary(
        month_label=today.strftime("%b %Y"),
        month_received=float(money(month_received)),
        pending_collection=float(money(pending_collection)),
        unpaid_bills=unpaid,
        ledger_bill_amount=float(money(ledger_bill)),
        ledger_paid=float(money(ledger_paid)),
        ledger_pending=float(money(ledger_bill - ledger_paid)),
    )
