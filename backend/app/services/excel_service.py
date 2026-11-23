"""Storage layer. The only module that touches the database.

The file keeps its original name and public API so the rest of the app is unchanged.
Data is stored in a database: SQLite on your PC, PostgreSQL in production (Neon).
Every value is stored as text. Services convert values to numbers with Decimal.
"""
from __future__ import annotations

import logging
import threading
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from typing import Any

from openpyxl import Workbook
from sqlalchemy import Column, MetaData, Table, Text, create_engine, delete, insert, select
from sqlalchemy import update as sa_update

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Sheet name -> column headers. The first column is always the record ID.
SHEETS: dict[str, list[str]] = {
    "Bills": [
        "bill_id", "bill_number", "bill_date", "customer_name", "customer_address",
        "project_name", "total_amount", "total_paid", "pending_amount", "status",
        "created_at", "updated_at", "old_balance",
    ],
    "Bill_Items": [
        "item_id", "bill_id", "date", "work_type", "description", "quantity",
        "unit", "rate", "bata", "amount", "base",
    ],
    "Payments": [
        "payment_id", "bill_id", "bill_number", "customer_name", "payment_date",
        "amount", "payment_method", "reference_number", "notes", "created_at",
    ],
    "Expenses": [
        "expense_id", "date", "category", "description", "amount",
        "payment_method", "notes", "created_at", "machine",
    ],
    "Daily_Work": [
        "work_id", "date", "customer_name", "work_type", "description", "quantity",
        "unit", "rate", "bata", "amount", "notes", "created_at",
    ],
    "Drivers": ["driver_id", "name", "phone", "salary", "joining_date", "status"],
    "Driver_Payments": [
        "payment_id", "driver_id", "driver_name", "payment_type", "date", "month",
        "amount", "payment_date", "notes", "status",
    ],
    "Settings": ["key", "value"],
}

ID_PREFIXES: dict[str, str] = {
    "Bills": "BILL",
    "Bill_Items": "ITM",
    "Payments": "PAY",
    "Expenses": "EXP",
    "Daily_Work": "WRK",
    "Drivers": "DRV",
    "Driver_Payments": "DPY",
}

# Columns written as numbers in the downloaded Excel file (so Excel can sum them)
NUMERIC_COLUMNS = {
    "total_amount", "total_paid", "pending_amount", "amount", "quantity", "rate", "base", "bata", "salary", "old_balance",
}


class StorageBusyError(Exception):
    """Kept for compatibility. Database errors are reported as 'Something went wrong'."""


def _to_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return format(value, "f")
    return str(value)


def _export_cell(column: str, value: Any) -> Any:
    if value is None or value == "":
        return None
    if column in NUMERIC_COLUMNS:
        try:
            return float(value)
        except (TypeError, ValueError):
            return value
    return value


class DataStore:
    def __init__(self, url: str) -> None:
        connect_args: dict[str, Any] = {}
        if url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
            db_file = url.removeprefix("sqlite:///")
            if db_file and db_file != ":memory:":
                Path(db_file).parent.mkdir(parents=True, exist_ok=True)

        self.engine = create_engine(url, connect_args=connect_args, pool_pre_ping=True)
        self.metadata = MetaData()
        self.tables: dict[str, Table] = {}
        for sheet, headers in SHEETS.items():
            columns = [Column(h, Text, primary_key=(i == 0)) for i, h in enumerate(headers)]
            self.tables[sheet] = Table(sheet.lower(), self.metadata, *columns)
        self.metadata.create_all(self.engine)
        self._add_missing_columns()
        self._lock = threading.RLock()  # serialises writes (matters for SQLite)
        logger.info("Database ready")

    # ------------------------------------------------------------- internals

    def _id_column(self, sheet: str):
        return self.tables[sheet].c[SHEETS[sheet][0]]

    def _next_id_in(self, conn, sheet: str) -> str:
        prefix = ID_PREFIXES[sheet]
        highest = 0
        for value in conn.execute(select(self._id_column(sheet))).scalars():
            text = str(value or "")
            if text.startswith(f"{prefix}-"):
                try:
                    highest = max(highest, int(text.rsplit("-", 1)[-1]))
                except ValueError:
                    continue
        return f"{prefix}-{highest + 1:05d}"

    def _add_missing_columns(self) -> None:
        """Add columns introduced by newer versions to tables that already exist."""
        from sqlalchemy import inspect, text

        inspector = inspect(self.engine)
        with self.engine.begin() as conn:
            for sheet, headers in SHEETS.items():
                table = sheet.lower()
                if not inspector.has_table(table):
                    continue
                existing = {c["name"] for c in inspector.get_columns(table)}
                for header in headers:
                    if header not in existing:
                        conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{header}" TEXT'))

    # ---------------------------------------------------------- public API

    def list_rows(self, sheet: str) -> list[dict[str, Any]]:
        table = self.tables[sheet]
        with self.engine.connect() as conn:
            rows = conn.execute(select(table)).mappings().all()
        return [dict(r) for r in rows]

    def get(self, sheet: str, record_id: str) -> dict[str, Any] | None:
        table = self.tables[sheet]
        with self.engine.connect() as conn:
            row = conn.execute(select(table).where(self._id_column(sheet) == record_id)).mappings().first()
        return dict(row) if row else None

    def create(self, sheet: str, data: dict[str, Any]) -> dict[str, Any]:
        """Add a record, generating its ID. Returns the stored record."""
        with self._lock, self.engine.begin() as conn:
            record = dict(data)
            record[SHEETS[sheet][0]] = self._next_id_in(conn, sheet)
            values = {h: _to_text(record.get(h)) for h in SHEETS[sheet]}
            conn.execute(insert(self.tables[sheet]).values(**values))
        return record

    def insert_raw(self, sheet: str, data: dict[str, Any]) -> None:
        """Insert a record keeping its existing ID. Used by the one-time Excel import."""
        values = {h: _to_text(data.get(h)) for h in SHEETS[sheet]}
        with self._lock, self.engine.begin() as conn:
            conn.execute(insert(self.tables[sheet]).values(**values))

    def update(self, sheet: str, record_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        id_column = SHEETS[sheet][0]
        values = {k: _to_text(v) for k, v in updates.items() if k in SHEETS[sheet] and k != id_column}
        with self._lock, self.engine.begin() as conn:
            exists = conn.execute(select(self._id_column(sheet)).where(self._id_column(sheet) == record_id)).first()
            if exists is None:
                return None
            if values:
                conn.execute(
                    sa_update(self.tables[sheet]).where(self._id_column(sheet) == record_id).values(**values)
                )
        return self.get(sheet, record_id)

    def delete(self, sheet: str, record_id: str) -> bool:
        with self._lock, self.engine.begin() as conn:
            result = conn.execute(delete(self.tables[sheet]).where(self._id_column(sheet) == record_id))
        return result.rowcount > 0

    def upsert_settings(self, values: dict[str, str]) -> None:
        table = self.tables["Settings"]
        with self._lock, self.engine.begin() as conn:
            for key, value in values.items():
                exists = conn.execute(select(table.c["key"]).where(table.c["key"] == key)).first()
                if exists:
                    conn.execute(sa_update(table).where(table.c["key"] == key).values(value=_to_text(value)))
                else:
                    conn.execute(insert(table).values(key=key, value=_to_text(value)))

    def snapshot(self, dest: Path) -> Path:
        """Write all data to an .xlsx file (read-only copy for the client)."""
        wb = Workbook()
        wb.remove(wb.active)
        for sheet, headers in SHEETS.items():
            ws = wb.create_sheet(sheet)
            ws.append(headers)
            for row in self.list_rows(sheet):
                ws.append([_export_cell(h, row.get(h)) for h in headers])
            ws.freeze_panes = "A2"
        wb.save(dest)
        return Path(dest)


@lru_cache
def get_excel_service() -> DataStore:
    """Single shared store. Name kept from the Excel version."""
    return DataStore(get_settings().DATABASE_URL)
