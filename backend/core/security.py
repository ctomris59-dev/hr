"""Password and JWT utilities for secure SaaS authentication."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from core.config import get_settings

settings = get_settings()
password_hasher = PasswordHash.recommended()


class TokenError(ValueError):
    """Raised when a JWT cannot be trusted or is not the expected token type."""


def hash_password(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password, password_hash)
    except Exception:
        return False


def _encode_token(
    *,
    user_id: str,
    tenant_id: str,
    role: str,
    token_version: int,
    token_type: str,
    expires_delta: timedelta,
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "token_version": token_version,
        "type": token_type,
        "iat": now,
        "nbf": now,
        "exp": now + expires_delta,
        "iss": "futurehr",
        "aud": "futurehr-api",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(*, user_id: str, tenant_id: str, role: str, token_version: int) -> str:
    return _encode_token(
        user_id=user_id,
        tenant_id=tenant_id,
        role=role,
        token_version=token_version,
        token_type="access",
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_MINUTES),
    )


def create_refresh_token(*, user_id: str, tenant_id: str, role: str, token_version: int) -> str:
    return _encode_token(
        user_id=user_id,
        tenant_id=tenant_id,
        role=role,
        token_version=token_version,
        token_type="refresh",
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_DAYS),
    )


def decode_token(token: str, *, expected_type: str | None = None) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            audience="futurehr-api",
            issuer="futurehr",
        )
    except InvalidTokenError as exc:
        raise TokenError("Invalid or expired token") from exc

    if expected_type and payload.get("type") != expected_type:
        raise TokenError("Unexpected token type")
    if not payload.get("sub") or not payload.get("tenant_id"):
        raise TokenError("Token identity is incomplete")
    return payload
