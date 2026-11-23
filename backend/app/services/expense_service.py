"""Expense storage rules."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.schemas.expense import ExpenseIn, ExpenseOut
from app.services.errors import NotFoundError
from app.services.excel_service import get_excel_service
from app.utils.calculations import money

EXPENSES = "Expenses"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _to_out(row: dict[str, Any]) -> ExpenseOut:
    return ExpenseOut(
        expense_id=row["expense_id"],
        date=str(row["date"])[:10],
        category=row["category"],
        machine=row.get("machine") or "General",  # rows saved before this column existed
        description=row.get("description") or "",
        amount=float(money(row.get("amount"))),
        payment_method=row.get("payment_method") or "",
        notes=row.get("notes") or "",
        created_at=str(row.get("created_at") or ""),
    )


def _fields(data: ExpenseIn) -> dict[str, Any]:
    return {
        "date": data.date.isoformat(),
        "category": data.category,
        "machine": data.machine,
        "description": data.description.strip(),
        "amount": money(data.amount),
        "payment_method": data.payment_method,
        "notes": data.notes.strip(),
    }


def list_expenses(category: str | None = None) -> list[ExpenseOut]:
    rows = get_excel_service().list_rows(EXPENSES)
    if category:
        rows = [r for r in rows if r.get("category") == category]
    rows.sort(key=lambda r: (str(r.get("date")), str(r.get("created_at") or "")), reverse=True)
    return [_to_out(r) for r in rows]


def get_expense(expense_id: str) -> ExpenseOut:
    row = get_excel_service().get(EXPENSES, expense_id)
    if row is None:
        raise NotFoundError("Expense not found.")
    return _to_out(row)


def create_expense(data: ExpenseIn) -> ExpenseOut:
    row = get_excel_service().create(EXPENSES, {**_fields(data), "created_at": _now()})
    return _to_out(row)


def update_expense(expense_id: str, data: ExpenseIn) -> ExpenseOut:
    updated = get_excel_service().update(EXPENSES, expense_id, _fields(data))
    if updated is None:
        raise NotFoundError("Expense not found.")
    return _to_out(updated)


def delete_expense(expense_id: str) -> None:
    if not get_excel_service().delete(EXPENSES, expense_id):
        raise NotFoundError("Expense not found.")
