"""Expense routes. All routes require a valid login token."""
from fastapi import APIRouter, Depends, Query, Response

from app.core.security import get_current_user
from app.schemas.expense import ExpenseIn, ExpenseOut
from app.services import expense_service

router = APIRouter(prefix="/expenses", tags=["Expenses"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(body: ExpenseIn) -> ExpenseOut:
    return expense_service.create_expense(body)


@router.get("", response_model=list[ExpenseOut])
def list_expenses(category: str | None = Query(None, max_length=60)) -> list[ExpenseOut]:
    return expense_service.list_expenses(category)


@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(expense_id: str) -> ExpenseOut:
    return expense_service.get_expense(expense_id)


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: str, body: ExpenseIn) -> ExpenseOut:
    return expense_service.update_expense(expense_id, body)


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: str) -> Response:
    expense_service.delete_expense(expense_id)
    return Response(status_code=204)
