"""One-time import of an old business_data.xlsx into the database.

Usage (from backend/, with DATABASE_URL set to the target database):
    python -m scripts.import_excel ../data/business_data.xlsx

Existing IDs are kept. Records whose ID already exists are skipped, so it is safe to re-run.
"""
import sys
from pathlib import Path

from openpyxl import load_workbook

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.excel_service import SHEETS, get_excel_service  # noqa: E402


def main(path: str) -> None:
    wb = load_workbook(path, data_only=True)
    store = get_excel_service()
    for sheet, headers in SHEETS.items():
        if sheet not in wb.sheetnames:
            print(f"{sheet}: not in workbook, skipped")
            continue
        ws = wb[sheet]
        xl_headers = [c.value for c in ws[1]]
        existing = {r[SHEETS[sheet][0]] for r in store.list_rows(sheet)}
        imported = skipped = 0
        for values in ws.iter_rows(min_row=2, values_only=True):
            if not values or values[0] in (None, ""):
                continue
            row = {h: v for h, v in zip(xl_headers, values) if h}
            if str(row.get(SHEETS[sheet][0])) in existing:
                skipped += 1
                continue
            store.insert_raw(sheet, row)
            imported += 1
        print(f"{sheet}: imported {imported}, skipped {skipped}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python -m scripts.import_excel <path-to-business_data.xlsx>")
    main(sys.argv[1])
