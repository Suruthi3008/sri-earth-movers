"""FastAPI application entry point.

Run from the backend/ folder:
    uvicorn app.main:app --reload
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, bills, dashboard, drivers, driver_payments, exports, expenses, payments, reports, work
from app.api import settings as settings_api
from app.core.config import get_settings
from app.services.errors import BusinessRuleError, NotFoundError
from app.services.excel_service import StorageBusyError, get_excel_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("rem")
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_excel_service()
    logger.info("Excel workbook ready")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Billing and management API for RAMESH EARTH MOVERS & BUILDERS (ARROW GROUPS)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StorageBusyError)
async def storage_busy_handler(_: Request, exc: StorageBusyError) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(NotFoundError)
async def not_found_handler(_: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(BusinessRuleError)
async def business_rule_handler(_: Request, exc: BusinessRuleError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again."})


app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(bills.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(work.router, prefix="/api")
app.include_router(work.jcb_router, prefix="/api")
app.include_router(drivers.router, prefix="/api")
app.include_router(driver_payments.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")
app.include_router(exports.router, prefix="/api")


@app.get("/api/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
