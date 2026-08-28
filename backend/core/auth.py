"""Server-side authentication and authorization dependencies."""
from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.config import get_settings
from core.database import get_db
from core.security import TokenError, decode_token
from db.models import TenantModel, UserModel

settings = get_settings()
bearer = HTTPBearer(auto_error=False)


class Principal(BaseModel):
    user_id: str
    tenant_id: str
    username: str
    role: str
    employee_id: str | None = None
    tenant_slug: str
    tenant_name: str


def ensure_secure_auth_enabled() -> None:
    if not settings.SAAS_AUTH_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Secure SaaS authentication is not enabled yet.",
        )
    if not settings.DATABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DATABASE_URL is not configured.",
        )
    if settings.SECRET_KEY == "change-me-in-production":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Secure authentication requires a production SECRET_KEY.",
        )


def get_current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Principal:
    ensure_secure_auth_enabled()
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    try:
        payload = decode_token(credentials.credentials, expected_type="access")
    except TokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user = db.scalar(
        select(UserModel).where(
            UserModel.id == str(payload["sub"]),
            UserModel.tenant_id == str(payload["tenant_id"]),
            UserModel.active.is_(True),
        )
    )
    if not user or user.token_version != int(payload.get("token_version", 0)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session is no longer valid")

    tenant = db.scalar(
        select(TenantModel).where(
            TenantModel.id == user.tenant_id,
            TenantModel.status == "ACTIVE",
        )
    )
    if not tenant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company account is not active")

    return Principal(
        user_id=user.id,
        tenant_id=user.tenant_id,
        username=user.username,
        role=user.role,
        employee_id=user.employee_id,
        tenant_slug=tenant.slug,
        tenant_name=tenant.name,
    )


def require_roles(*allowed_roles: str) -> Callable:
    allowed = {role.upper() for role in allowed_roles}

    def dependency(principal: Principal = Depends(get_current_principal)) -> Principal:
        if principal.role.upper() not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission")
        return principal

    return dependency
