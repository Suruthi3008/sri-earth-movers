"""Bill rules: numbering, line calculation (incl. minimum charge), totals, advance, status, saving."""
from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from app.schemas.bill import DEFAULT_UNITS, BillIn, BillOut, BillSummary, WorkItemIn, WorkItemOut
from app.services.errors import BusinessRuleError, NotFoundError
from app.services.excel_service import get_excel_service
from app.services.settings_service import get_all as get_settings_values
from app.services.settings_service import get_text
from app.utils.calculations import bill_status, bill_total, money, pending_amount, to_decimal

BILLS = "Bills"
ITEMS = "Bill_Items"
PAYMENTS = "Payments"
ADVANCE_METHOD = "Advance"  # the advance is stored as a payment with this method
ZERO = Decimal("0")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _to_date(value: Any) -> date:
    return date.fromisoformat(str(value)[:10])


def _paid_by_bill(exclude_advance: bool = False) -> dict[str, Decimal]:
    totals: dict[str, Decimal] = {}
    for payment in get_excel_service().list_rows(PAYMENTS):
        if exclude_advance and payment.get("payment_method") == ADVANCE_METHOD:
            continue
        bill_id = payment.get("bill_id")
        if bill_id:
            totals[bill_id] = totals.get(bill_id, ZERO) + money(payment.get("amount"))
    return totals


def _advance_of(bill_id: str) -> Decimal:
    return sum(
        (money(p.get("amount")) for p in get_excel_service().list_rows(PAYMENTS)
         if p.get("bill_id") == bill_id and p.get("payment_method") == ADVANCE_METHOD),
        ZERO,
    )


def _summary(row: dict[str, Any], paid: Decimal) -> BillSummary:
    total = money(row.get("total_amount"))
    paid = money(paid)
    return BillSummary(
        bill_id=row["bill_id"],
        bill_number=str(row["bill_number"]),
        bill_date=_to_date(row["bill_date"]),
        customer_name=row["customer_name"],
        project_name=row.get("project_name") or "",
        total_amount=float(total),
        total_paid=float(paid),
        pending_amount=float(pending_amount(total, paid)),
        status=bill_status(total, paid),
    )


def _item_out(row: dict[str, Any]) -> WorkItemOut:
    quantity = to_decimal(row.get("quantity"))
    rate = money(row.get("rate"))
    stored_base = row.get("base")
    base = money(stored_base) if stored_base not in (None, "") else money(quantity * rate)
    unit = row.get("unit") or ""
    cfg = _billing_config()
    is_minimum_hours = (
        row.get("work_type") == "JCB Work"
        and unit.strip().lower() in {"hr", "hrs", "hour", "hours"}
        and quantity <= cfg["threshold"]
    )
    return WorkItemOut(
        item_id=row["item_id"],
        date=_to_date(row["date"]),
        work_type=row["work_type"],
        description=row.get("description") or "",
        quantity=float(quantity),
        quantity_display="Minimum Hrs" if is_minimum_hours else "",
        unit=unit,
        rate=float(rate),
        base=float(base),
        bata=float(money(row.get("bata"))),
        amount=float(money(row.get("amount"))),
    )


def _items_for(bill_id: str) -> list[dict[str, Any]]:
    rows = [r for r in get_excel_service().list_rows(ITEMS) if r.get("bill_id") == bill_id]
    return sorted(rows, key=lambda r: (str(r.get("date")), str(r.get("item_id"))))


def _remove_items(bill_id: str) -> None:
    excel = get_excel_service()
    for row in _items_for(bill_id):
        excel.delete(ITEMS, row["item_id"])


def _remove_advance(bill_id: str) -> None:
    excel = get_excel_service()
    for payment in excel.list_rows(PAYMENTS):
        if payment.get("bill_id") == bill_id and payment.get("payment_method") == ADVANCE_METHOD:
            excel.delete(PAYMENTS, payment["payment_id"])


def _add_advance(bill_id: str, bill_number: str, customer_name: str, bill_date: date, amount: Decimal) -> None:
    if amount <= 0:
        return
    get_excel_service().create(PAYMENTS, {
        "bill_id": bill_id,
        "bill_number": bill_number,
        "customer_name": customer_name,
        "payment_date": bill_date.isoformat(),
        "amount": money(amount),
        "payment_method": ADVANCE_METHOD,
        "reference_number": "",
        "notes": "Advance taken with bill",
        "created_at": _now(),
    })


def _next_bill_number(prefix: str) -> str:
    highest = 0
    for row in get_excel_service().list_rows(BILLS):
        raw = str(row.get("bill_number") or "")
        if raw.startswith(prefix):
            digits = raw[len(prefix):]
            if digits.isdigit():
                highest = max(highest, int(digits))
    return f"{prefix}{highest + 1:02d}"


def _billing_config() -> dict[str, Decimal]:
    values = get_settings_values()
    return {
        "min_price": money(values["min_hours_price"]),
        "threshold": to_decimal(values["min_hours_threshold"]),
    }


def _line_base(work_type: str, unit: str, quantity: Any, rate: Any, cfg: dict[str, Decimal]) -> Decimal:
    """JCB hours at or below the threshold cost the minimum charge. Everything else is quantity × rate."""
    qty = to_decimal(quantity)
    if work_type == "JCB Work" and unit != "day" and qty <= cfg["threshold"]:
        return money(cfg["min_price"])
    return money(qty * to_decimal(rate))


def _prepare_items(items: list[WorkItemIn], cfg: dict[str, Decimal]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in items:
        unit = item.unit.strip() or DEFAULT_UNITS[item.work_type]
        if item.work_type == "Lorry Service":
            description = item.material  # the material is the description on the bill
        else:
            description = item.description.strip()
            if not description:
                if item.work_type == "Other Work":
                    raise BusinessRuleError("Enter a description for each Other Work item.")
                description = item.work_type

        base = _line_base(item.work_type, unit, item.quantity, item.rate, cfg)
        rows.append(
            {
                "date": item.date.isoformat(),
                "work_type": item.work_type,
                "description": description,
                "quantity": item.quantity,
                "unit": unit,
                "rate": item.rate,
                "base": base,
                "bata": item.bata,
                "amount": money(base + to_decimal(item.bata)),
            }
        )
    return rows


def list_bills(query: str | None = None, status: str | None = None) -> list[BillSummary]:
    excel = get_excel_service()
    paid_map = _paid_by_bill()
    rows = sorted(excel.list_rows(BILLS), key=lambda r: str(r.get("created_at") or ""), reverse=True)

    needle = (query or "").strip().lower()
    result: list[BillSummary] = []
    for row in rows:
        summary = _summary(row, paid_map.get(row["bill_id"], ZERO))
        if needle and needle not in summary.customer_name.lower() and needle not in summary.bill_number.lower():
            continue
        if status and summary.status != status:
            continue
        result.append(summary)
    return result


def get_bill(bill_id: str) -> BillOut:
    row = get_excel_service().get(BILLS, bill_id)
    if row is None:
        raise NotFoundError("Bill not found.")

    summary = _summary(row, _paid_by_bill().get(bill_id, ZERO))
    advance = money(_advance_of(bill_id))
    old_balance = money(row.get("old_balance"))
    return BillOut(
        **summary.model_dump(),
        customer_address=row.get("customer_address") or "",
        advance=float(advance),
        old_balance=float(old_balance),
        total_balance=float(money(Decimal(str(summary.total_amount)) + old_balance - advance)),
        items=[_item_out(r) for r in _items_for(bill_id)],
        created_at=str(row.get("created_at") or ""),
        updated_at=str(row.get("updated_at") or ""),
    )


def create_bill(data: BillIn) -> BillOut:
    excel = get_excel_service()
    cfg = _billing_config()
    rows = _prepare_items(data.items, cfg)
    total = bill_total(r["amount"] for r in rows)
    if total <= 0:
        raise BusinessRuleError("The bill total must be more than zero.")
    advance = money(data.advance)
    old_balance = money(data.old_balance)
    if advance > total:
        raise BusinessRuleError("The advance cannot be more than the total amount.")

    now = _now()
    bill = excel.create(
        BILLS,
        {
            "bill_number": _next_bill_number(get_text("bill_number_prefix")),
            "bill_date": data.bill_date.isoformat(),
            "customer_name": data.customer_name,
            "customer_address": data.customer_address.strip(),
            "project_name": data.project_name.strip(),
            "total_amount": total,
            "total_paid": advance,
            "old_balance": old_balance,
            "pending_amount": pending_amount(total, advance),
            "status": bill_status(total, advance),
            "created_at": now,
            "updated_at": now,
        },
    )

    # The database has no transactions, so roll back by hand if anything fails
    try:
        for row in rows:
            excel.create(ITEMS, {"bill_id": bill["bill_id"], **row})
        _add_advance(bill["bill_id"], bill["bill_number"], data.customer_name, data.bill_date, advance)
    except Exception:
        _remove_advance(bill["bill_id"])
        _remove_items(bill["bill_id"])
        excel.delete(BILLS, bill["bill_id"])
        raise

    return get_bill(bill["bill_id"])


def update_bill(bill_id: str, data: BillIn) -> BillOut:
    excel = get_excel_service()
    if excel.get(BILLS, bill_id) is None:
        raise NotFoundError("Bill not found.")

    cfg = _billing_config()
    rows = _prepare_items(data.items, cfg)
    total = bill_total(r["amount"] for r in rows)
    if total <= 0:
        raise BusinessRuleError("The bill total must be more than zero.")
    advance = money(data.advance)
    old_balance = money(data.old_balance)
    if advance > total:
        raise BusinessRuleError("The advance cannot be more than the total amount.")

    paid_other = _paid_by_bill(exclude_advance=True).get(bill_id, ZERO)
    if total < paid_other + advance:
        raise BusinessRuleError(
            f"The total cannot be less than the ₹{paid_other + advance:,.2f} already received for this bill."
        )

    # Save new items first, then remove the old ones, so a failure never leaves the bill empty
    old_items = _items_for(bill_id)
    for row in rows:
        excel.create(ITEMS, {"bill_id": bill_id, **row})
    for old in old_items:
        excel.delete(ITEMS, old["item_id"])

    bill = excel.get(BILLS, bill_id)
    _remove_advance(bill_id)
    _add_advance(bill_id, bill["bill_number"], data.customer_name, data.bill_date, advance)

    paid_total = paid_other + advance
    excel.update(
        BILLS,
        bill_id,
        {
            "bill_date": data.bill_date.isoformat(),
            "customer_name": data.customer_name,
            "customer_address": data.customer_address.strip(),
            "project_name": data.project_name.strip(),
            "total_amount": total,
            "total_paid": paid_total,
            "old_balance": old_balance,
            "pending_amount": pending_amount(total, paid_total),
            "status": bill_status(total, paid_total),
            "updated_at": _now(),
        },
    )
    return get_bill(bill_id)


def delete_bill(bill_id: str) -> None:
    excel = get_excel_service()
    if excel.get(BILLS, bill_id) is None:
        raise NotFoundError("Bill not found.")
    if bill_id in _paid_by_bill(exclude_advance=True):
        raise BusinessRuleError(
            "This bill has payments recorded. Remove the payments before deleting the bill."
        )

    _remove_advance(bill_id)
    _remove_items(bill_id)
    excel.delete(BILLS, bill_id)
