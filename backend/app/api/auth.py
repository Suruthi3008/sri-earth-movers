"""Authentication routes: login and current user."""
import hmac
import logging

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import get_settings
from app.core.security import create_access_token, get_current_user, verify_password
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest) -> TokenResponse:
    settings = get_settings()

    username_ok = hmac.compare_digest(body.username, settings.ADMIN_USERNAME)
    password_ok = verify_password(body.password, settings.ADMIN_PASSWORD_HASH)

    if not (username_ok and password_ok):
        logger.warning("Failed login attempt for username '%s'", body.username[:50])
        # Same message for both cases so attackers cannot tell which field was wrong
        raise HTTPException(status_code=401, detail="Wrong username or password.")

    return TokenResponse(
        access_token=create_access_token(settings.ADMIN_USERNAME),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserResponse)
def me(username: str = Depends(get_current_user)) -> UserResponse:
    return UserResponse(username=username)
