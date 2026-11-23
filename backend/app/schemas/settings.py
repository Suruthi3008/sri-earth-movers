"""Business settings shape. Validated before anything is written to Excel."""
from decimal import Decimal

from pydantic import BaseModel, Field


class SettingsIn(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=100)
    business_tagline: str = Field("", max_length=100)
    address: str = Field("", max_length=250)
    phone: str = Field("", max_length=60)
    email: str = Field("", max_length=120, pattern=r"^$|^[^@\s]+@[^@\s]+\.[^@\s]+$")
    gstin: str = Field("", max_length=15, pattern=r"^$|^[0-9A-Z]{15}$")

    bank_account_name: str = Field("", max_length=100)
    bank_account_number: str = Field("", max_length=30, pattern=r"^[0-9]*$")
    bank_ifsc: str = Field("", max_length=11, pattern=r"^$|^[A-Z]{4}0[A-Z0-9]{6}$")
    bank_account_type: str = Field("", max_length=30)
    gpay: str = Field("", max_length=20)

    jcb_rate: Decimal = Field(..., ge=0, le=1_000_000)
    default_bata: Decimal = Field(..., ge=0, le=1_000_000)
    min_hours_price: Decimal = Field(..., ge=0, le=1_000_000)
    min_hours_threshold: Decimal = Field(..., ge=0, le=100)
    day_rate: Decimal = Field(..., ge=0, le=1_000_000)
    bill_number_prefix: str = Field("", max_length=10, pattern=r"^[A-Za-z0-9-]*$")
