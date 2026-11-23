"""Test setup. Uses a temporary workbook so real business data is never touched."""
import os
import tempfile

import bcrypt
import pytest

TEST_PASSWORD = "test-password"
_TMP = tempfile.mkdtemp(prefix="rem-test-")

# Must be set before the app is imported, because settings are read at import time
os.environ.update(
    {
        "SECRET_KEY": "test-secret-key-that-is-long-enough-1234567890",
        "ADMIN_USERNAME": "admin",
        "ADMIN_PASSWORD_HASH": bcrypt.hashpw(TEST_PASSWORD.encode(), bcrypt.gensalt()).decode(),
        "DATABASE_URL": f"sqlite:///{os.path.join(_TMP, 'test.db')}",
        "BACKUP_DIR": os.path.join(_TMP, "backups"),
        "GENERATED_BILLS_DIR": os.path.join(_TMP, "bills"),
    }
)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client
