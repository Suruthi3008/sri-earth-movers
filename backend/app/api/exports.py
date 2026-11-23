"""Excel export. Gives a read-only copy of the data; the live workbook is never sent."""
import os
import tempfile
from datetime import date
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import FileResponse

from app.core.security import get_current_user
from app.services.excel_service import get_excel_service

router = APIRouter(prefix="/exports", tags=["Exports"], dependencies=[Depends(get_current_user)])

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/excel")
def download_excel(background_tasks: BackgroundTasks) -> FileResponse:
    fd, tmp_name = tempfile.mkstemp(suffix=".xlsx")
    os.close(fd)
    tmp_path = Path(tmp_name)
    get_excel_service().snapshot(tmp_path)
    background_tasks.add_task(tmp_path.unlink, missing_ok=True)

    filename = f"Ramesh-Earth-Movers-data-{date.today():%Y-%m-%d}.xlsx"
    return FileResponse(tmp_path, media_type=XLSX_MEDIA_TYPE, filename=filename)
