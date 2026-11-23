"""Money and billing math. Decimal avoids floating-point rounding errors."""
from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Iterable

CENT = Decimal("0.01")


def to_decimal(value: Any) -> Decimal:
    if value is None or value == "":
        return Decimal("0")
    return Decimal(str(value))


def money(value: Any) -> Decimal:
    """Round to two decimal places (paise)."""
    return to_decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def line_amount(quantity: Any, rate: Any, bata: Any = 0) -> Decimal:
    """Amount = quantity × rate + bata. Example: 5.5 × 900 + 500 = 5450."""
    return money(to_decimal(quantity) * to_decimal(rate) + to_decimal(bata))


def bill_total(amounts: Iterable[Any]) -> Decimal:
    return money(sum((money(a) for a in amounts), Decimal("0")))


def pending_amount(total: Any, paid: Any) -> Decimal:
    """Pending = bill total − payments received."""
    return money(to_decimal(total) - to_decimal(paid))


def bill_status(total: Any, paid: Any) -> str:
    """Return 'Pending', 'Partly Paid' or 'Paid'."""
    total_d = money(total)
    paid_d = money(paid)
    if paid_d <= 0:
        return "Pending"
    if paid_d >= total_d:
        return "Paid"
    return "Partly Paid"


def profit(income: Any, expenses: Any) -> Decimal:
    """Profit = Income − Expenses."""
    return money(to_decimal(income) - to_decimal(expenses))
