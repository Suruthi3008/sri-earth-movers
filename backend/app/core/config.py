"""Application configuration loaded from environment variables and backend/.env."""
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root: ramesh-earth-movers/
ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / "backend" / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Sri Earth Movers API"

    SECRET_KEY: str = Field(..., min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    CORS_ORIGINS: str = "http://localhost:5173"

    # SQLite file locally; set to a PostgreSQL URL in production
    DATABASE_URL: str = f"sqlite:///{ROOT_DIR / 'data' / 'business.db'}"
    EXCEL_FILE_PATH: Path = ROOT_DIR / "data" / "business_data.xlsx"  # used only by the import script
    BACKUP_DIR: Path = ROOT_DIR / "data" / "backups"
    BACKUP_KEEP: int = 30
    GENERATED_BILLS_DIR: Path = ROOT_DIR / "generated_bills"

    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD_HASH: str = Field(..., min_length=20)

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
