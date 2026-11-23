"""Bill routes. All routes require a valid login token."""
from fastapi import APIRouter, Depends, Query, Response

from app.core.security import get_current_user
from app.schemas.bill import BillIn, BillOut, BillSummary
from app.services import bill_service, pdf_service

router = APIRouter(prefix="/bills", tags=["Bills"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=BillOut, status_code=201)
def create_bill(body: BillIn) -> BillOut:
    return bill_service.create_bill(body)


@router.get("", response_model=list[BillSummary])
def list_bills(
    q: str | None = Query(None, max_length=100),
    status: str | None = Query(None, pattern="^(Pending|Partly Paid|Paid)$"),
) -> list[BillSummary]:
    return bill_service.list_bills(q, status)


@router.get("/{bill_id}", response_model=BillOut)
def get_bill(bill_id: str) -> BillOut:
    return bill_service.get_bill(bill_id)


@router.put("/{bill_id}", response_model=BillOut)
def update_bill(bill_id: str, body: BillIn) -> BillOut:
    return bill_service.update_bill(bill_id, body)


@router.delete("/{bill_id}", status_code=204)
def delete_bill(bill_id: str) -> Response:
    bill_service.delete_bill(bill_id)
    return Response(status_code=204)


@router.get("/{bill_id}/pdf")
def bill_pdf(bill_id: str) -> Response:
    pdf_bytes, filename = pdf_service.render_bill_pdf(bill_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
