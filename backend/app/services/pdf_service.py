"""Bill PDF generation with reportlab. All content comes from the stored bill and Settings."""
from __future__ import annotations

import logging
import re
from decimal import Decimal, InvalidOperation
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import HRFlowable, Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.config import get_settings
from app.schemas.bill import BillOut
from app.services import bill_service, settings_service

logger = logging.getLogger(__name__)

ASSETS_DIR = Path(__file__).resolve().parents[1] / "assets"
LOGO_PATH = ASSETS_DIR / "logo.jpeg"
FONT_REGULAR = ASSETS_DIR / "fonts" / "arial.ttf"
FONT_BOLD = ASSETS_DIR / "fonts" / "arialbd.ttf"

ORANGE = colors.HexColor("#D98A00")
RED = colors.HexColor("#C0392B")
GREY_TEXT = colors.HexColor("#4B5563")
HEADER_BG = colors.HexColor("#E5E7EB")
INFO_BG = colors.HexColor("#F3F4F6")
LINE = colors.HexColor("#374151")

USABLE_WIDTH = 180 * mm


# Tried in order. Arial is used when present (Windows); DejaVu Sans is bundled as a fallback.
# Both contain the ₹ glyph, so bills never fall back to "Rs.".
FONT_PAIRS = [
    (ASSETS_DIR / "fonts" / "arial.ttf", ASSETS_DIR / "fonts" / "arialbd.ttf"),
    (ASSETS_DIR / "fonts" / "DejaVuSans.ttf", ASSETS_DIR / "fonts" / "DejaVuSans-Bold.ttf"),
]


def _fonts() -> tuple[str, str, str]:
    """Return (regular font, bold font, currency symbol)."""
    for regular_path, bold_path in FONT_PAIRS:
        if regular_path.exists() and bold_path.exists():
            pdfmetrics.registerFont(TTFont("BillRegular", str(regular_path)))
            pdfmetrics.registerFont(TTFont("BillBold", str(bold_path)))
            return "BillRegular", "BillBold", "₹"
    logger.warning("No TrueType font found in app/assets/fonts. Bills will use 'Rs.' instead of ₹.")
    return "Helvetica", "Helvetica-Bold", "Rs. "


def _styles(regular: str, bold: str) -> dict[str, ParagraphStyle]:
    return {
        "title": ParagraphStyle("title", fontName=bold, fontSize=12, alignment=TA_CENTER, leading=15, spaceAfter=4),
        "biz": ParagraphStyle("biz", fontName=bold, fontSize=16, leading=19, textColor=colors.black),
        "sub": ParagraphStyle("sub", fontName=bold, fontSize=9.5, leading=12, textColor=ORANGE),
        "small": ParagraphStyle("small", fontName=regular, fontSize=9, leading=12, textColor=GREY_TEXT),
        "label": ParagraphStyle("label", fontName=bold, fontSize=9.5, leading=12, textColor=ORANGE),
        "label_dark": ParagraphStyle("label_dark", fontName=bold, fontSize=9.5, leading=12, textColor=GREY_TEXT),
        "value": ParagraphStyle("value", fontName=bold, fontSize=9.5, leading=12),
        "gstin": ParagraphStyle("gstin", fontName=bold, fontSize=9.5, leading=12, textColor=colors.HexColor("#8B4513")),
        "bold": ParagraphStyle("bold", fontName=bold, fontSize=11, leading=14),
        "body": ParagraphStyle("body", fontName=regular, fontSize=10, leading=13),
        "head": ParagraphStyle("head", fontName=bold, fontSize=8.5, leading=10, alignment=TA_CENTER),
        "cell": ParagraphStyle("cell", fontName=regular, fontSize=9, leading=11),
        "cell_center": ParagraphStyle("cell_center", fontName=regular, fontSize=9, leading=11, alignment=TA_CENTER),
        "cell_right": ParagraphStyle("cell_right", fontName=regular, fontSize=9, leading=11, alignment=TA_RIGHT),
        "total": ParagraphStyle("total", fontName=bold, fontSize=13, leading=16, alignment=TA_RIGHT, textColor=RED),
        "total_line": ParagraphStyle("total_line", fontName=regular, fontSize=11, leading=14, alignment=TA_RIGHT, textColor=RED),
        "underline": ParagraphStyle("underline", fontName=regular, fontSize=12, leading=15),
        "sign": ParagraphStyle("sign", fontName=bold, fontSize=10, leading=13, textColor=RED),
        "footer": ParagraphStyle("footer", fontName=bold, fontSize=10, leading=12, alignment=TA_CENTER),
    }


def _para(text: object, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(str(text or "")).replace("\n", "<br/>"), style)


def _amount(value: object, currency: str) -> str:
    """Format money with Indian grouping, e.g. ₹1,95,000.00."""
    try:
        amount = Decimal(str(value or 0)).quantize(Decimal("0.01"))
    except InvalidOperation:
        amount = Decimal("0.00")

    sign = "-" if amount < 0 else ""
    whole, fraction = f"{abs(amount):.2f}".split(".")
    if len(whole) > 3:
        head, tail = whole[:-3], whole[-3:]
        groups: list[str] = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        whole = ",".join(groups + [tail])
    return f"{sign}{currency}{whole}.{fraction}"


def _quantity(value: object) -> str:
    return f"{Decimal(str(value)).normalize():f}"


def _safe_filename(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "-", name).strip("-")
    return cleaned or "bill"


def _header(bill: BillOut, settings: dict[str, str], s: dict[str, ParagraphStyle]) -> Table:
    if LOGO_PATH.exists():
        logo = Image(str(LOGO_PATH), width=28 * mm, height=28 * mm, kind="proportional")
    else:
        logo = Spacer(28 * mm, 28 * mm)

    business = [
        _para(settings["business_name"], s["biz"]),
        _para(settings["business_tagline"], s["sub"]),
        Spacer(1, 5),
        _para(settings["address"], s["small"]),
        _para(f"Email: {settings['email']}", s["small"]),
        _para(f"Contact: {settings['phone']}", s["small"]),
    ]

    info = Table(
        [
            [_para("Bill No:", s["label_dark"]), _para(bill.bill_number, s["value"])],
            [_para("Date:", s["label_dark"]), _para(bill.bill_date.strftime("%d/%m/%Y"), s["value"])],
            [_para("GSTIN:", s["label_dark"]), _para(settings["gstin"], s["gstin"])],
        ],
        colWidths=[18 * mm, 38 * mm],
    )
    info.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), INFO_BG),
                ("LINEBEFORE", (0, 0), (0, -1), 2, ORANGE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )

    header = Table([[logo, business, info]], colWidths=[32 * mm, 90 * mm, 58 * mm])
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return header


def _parties(bill: BillOut, s: dict[str, ParagraphStyle]) -> Table:
    scope = ", ".join(dict.fromkeys(item.work_type for item in bill.items))

    left = [
        _para("BILL ISSUED TO:", s["label"]),
        Spacer(1, 3),
        _para(bill.customer_name, s["bold"]),
        _para(bill.customer_address, s["body"]),
    ]
    right = [
        _para("PROJECT DETAILS", s["label"]),
        Spacer(1, 3),
        Paragraph(f"<b>Project Name:</b> {escape(bill.project_name or '-')}", s["body"]),
        Spacer(1, 6),
        Paragraph(f"<b>Work Scope:</b> {escape(scope)}", s["body"]),
    ]
    table = Table([[left, right]], colWidths=[90 * mm, 90 * mm])
    table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    return table


def _items_table(bill: BillOut, currency: str, s: dict[str, ParagraphStyle]) -> Table:
    rows: list[list[object]] = [
        [_para(h, s["head"]) for h in ["NO", "DATE", "DESCRIPTION", "QTY", "RATE", "BATA", "AMOUNT"]]
    ]
    for index, item in enumerate(bill.items, start=1):
        rows.append(
            [
                _para(index, s["cell_center"]),
                _para(item.date.strftime("%d/%m/%Y"), s["cell_center"]),
                _para(item.description, s["cell"]),
                _para(
                    item.quantity_display or f"{_quantity(item.quantity)} {item.unit}",
                    s["cell_center"],
                ),
                _para(_amount(item.base, currency), s["cell_right"]),
                _para(_amount(item.bata, currency) if item.bata else "-", s["cell_right"]),
                _para(_amount(item.amount, currency), s["cell_right"]),
            ]
        )

    table = Table(
        rows,
        colWidths=[11 * mm, 24 * mm, 36 * mm, 20 * mm, 26 * mm, 26 * mm, 37 * mm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.6, LINE),
                ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def _total(bill: BillOut, currency: str, s: dict[str, ParagraphStyle]) -> Table:
    """Summary box: Advance, Old Balance (only if given), then Total Balance = work total + old balance - advance."""
    work_total = Decimal(str(bill.total_amount))
    advance = Decimal(str(bill.advance or 0))
    old_balance = Decimal(str(bill.old_balance or 0))
    total_balance = work_total + old_balance - advance

    lines = []
    if advance > 0:
        lines.append(Paragraph(escape(f"Advance = {_amount(advance, currency)}"), s["total_line"]))
    if old_balance > 0:
        lines.append(Paragraph(escape(f"Old Balance = {_amount(old_balance, currency)}"), s["total_line"]))
    lines.append(Paragraph(escape(f"Total Balance = {_amount(total_balance, currency)}"), s["total"]))

    table = Table([[line] for line in lines], colWidths=[USABLE_WIDTH])
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.6, LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def _bank_details(settings: dict[str, str], s: dict[str, ParagraphStyle]) -> list[object]:
    lines = [
        ("ACCOUNT NO", settings["bank_account_number"]),
        ("ACC NAME", settings["bank_account_name"]),
        ("IFSC", settings["bank_ifsc"]),
        ("ACCOUNT TYPE", settings["bank_account_type"]),
        ("GPAY", settings["gpay"]),
    ]
    flow: list[object] = [Paragraph("<u>Bank Details</u>", s["underline"]), Spacer(1, 4)]
    for label, value in lines:
        if value:
            flow.append(Paragraph(f"{label} : {escape(value)}", s["body"]))
    return flow


SIGNATURE_PATH = ASSETS_DIR / "signature.png"
SIGNATURE_WIDTH = 45 * mm


def _signature(settings: dict[str, str], s: dict[str, ParagraphStyle]) -> list[object]:
    """Signature image (if provided) above the 'For : ...' line."""
    sign_line = Table(
        [[Paragraph(f"For : {escape(settings['business_name'])}", s["sign"])]],
        colWidths=[72 * mm],
    )
    sign_line.setStyle(TableStyle([("LINEABOVE", (0, 0), (-1, 0), 0.8, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))

    flow: list[object] = []
    if SIGNATURE_PATH.exists():
        from reportlab.lib.utils import ImageReader

        img_w, img_h = ImageReader(str(SIGNATURE_PATH)).getSize()
        flow.append(Image(str(SIGNATURE_PATH), width=SIGNATURE_WIDTH, height=SIGNATURE_WIDTH * img_h / img_w, hAlign="LEFT"))
        flow.append(Spacer(1, 2 * mm))
    else:
        flow.append(Spacer(1, 22 * mm))
    flow.append(sign_line)
    return flow


def _story(bill: BillOut, settings: dict[str, str], s: dict[str, ParagraphStyle], currency: str) -> list[object]:
    bottom = Table([[_bank_details(settings, s), _signature(settings, s)]], colWidths=[104 * mm, 76 * mm])
    bottom.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "BOTTOM"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))

    return [
        _para("Cash Bill", s["title"]),
        Spacer(1, 4),
        _header(bill, settings, s),
        HRFlowable(width="100%", thickness=1.2, color=LINE, spaceBefore=6, spaceAfter=8),
        _parties(bill, s),
        HRFlowable(width="100%", thickness=0.6, color=LINE, spaceBefore=8, spaceAfter=10),
        _items_table(bill, currency, s),
        _total(bill, currency, s),
        Spacer(1, 14),
        bottom,
        Spacer(1, 16),
        _para("THANK YOU", s["footer"]),
    ]


def render_bill_pdf(bill_id: str) -> tuple[bytes, str]:
    """Build the PDF for one bill. Returns (pdf bytes, filename)."""
    bill = bill_service.get_bill(bill_id)
    settings = settings_service.get_all()
    regular, bold, currency = _fonts()
    styles = _styles(regular, bold)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title=f"Cash Bill {bill.bill_number}",
        author=settings["business_name"],
    )
    doc.build(_story(bill, settings, styles, currency))
    pdf_bytes = buffer.getvalue()

    filename = f"Bill-{_safe_filename(bill.bill_number)}.pdf"
    output_dir = get_settings().GENERATED_BILLS_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / filename).write_bytes(pdf_bytes)

    return pdf_bytes, filename
