"""Versioned secure authentication endpoints for FutureHR SaaS mode.

These endpoints are additive.  The current browser/localStorage demo login remains
untouched until the frontend is explicitly switched to secure auth.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.auth import Principal, ensure_secure_auth_enabled, get_current_principal
from core.config import get_settings
from core.database import get_db
from core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from db.models import EmployeeModel, TenantModel, UserModel

settings = get_settings()
router = APIRouter(prefix="/api/v1/auth", tags=["SaaS Auth"])


class LoginRequest(BaseModel):
    tenant_slug: str = Field(min_length=2, max_length=80)
    username: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=1, max_length=256)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20)


class UserView(BaseModel):
    id: str
    username: str
    role: str
    employee_id: str | None
    employee_name: str | None
    department: str | None
    position: str | None
    tenant_id: str
    tenant_slug: str
    tenant_name: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserView


def _user_view(db: Session, user: UserModel, tenant: TenantModel) -> UserView:
    employee = db.get(EmployeeModel, user.employee_id) if user.employee_id else None
    return UserView(
        id=user.id,
        username=user.username,
        role=user.role,
        employee_id=user.employee_id,
        employee_name=employee.full_name if employee else None,
        department=employee.department if employee else None,
        position=employee.position if employee else None,
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_name=tenant.name,
    )


def _tokens(user: UserModel, tenant: TenantModel, db: Session) -> TokenResponse:
    access_token = create_access_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=user.role,
        token_version=user.token_version,
    )
    refresh_token = create_refresh_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=user.role,
        token_version=user.token_version,
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_MINUTES * 60,
        user=_user_view(db, user, tenant),
    )


@router.get("/status")
def auth_status():
    """Public readiness endpoint; never exposes secrets or connection strings."""
    return {
        "secure_auth_enabled": settings.SAAS_AUTH_ENABLED,
        "database_configured": bool(settings.DATABASE_URL),
        "ready": settings.secure_auth_ready,
        "mode": settings.DATA_MODE,
    }


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    ensure_secure_auth_enabled()

    tenant = db.scalar(
        select(TenantModel).where(
            func.lower(TenantModel.slug) == payload.tenant_slug.strip().lower(),
            TenantModel.status == "ACTIVE",
        )
    )
    if not tenant:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid company or credentials")

    user = db.scalar(
        select(UserModel).where(
            UserModel.tenant_id == tenant.id,
            func.lower(UserModel.username) == payload.username.strip().lower(),
            UserModel.active.is_(True),
        )
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid company or credentials")

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return _tokens(user, tenant, db)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    ensure_secure_auth_enabled()
    try:
        token_payload = decode_token(payload.refresh_token, expected_type="refresh")
    except TokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user = db.scalar(
        select(UserModel).where(
            UserModel.id == str(token_payload["sub"]),
            UserModel.tenant_id == str(token_payload["tenant_id"]),
            UserModel.active.is_(True),
        )
    )
    if not user or user.token_version != int(token_payload.get("token_version", 0)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session is no longer valid")

    tenant = db.scalar(
        select(TenantModel).where(
            TenantModel.id == user.tenant_id,
            TenantModel.status == "ACTIVE",
        )
    )
    if not tenant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company account is not active")
    return _tokens(user, tenant, db)


@router.get("/me", response_model=UserView)
def me(principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)):
    user = db.get(UserModel, principal.user_id)
    tenant = db.get(TenantModel, principal.tenant_id)
    if not user or not tenant:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session is no longer valid")
    return _user_view(db, user, tenant)


@router.post("/logout-all")
def logout_all(principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)):
    """Invalidate all access/refresh tokens for the current user."""
    user = db.get(UserModel, principal.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session is no longer valid")
    user.token_version += 1
    db.commit()
    return {"success": True}
