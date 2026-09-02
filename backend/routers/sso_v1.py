"""OIDC SSO bridge for Microsoft Entra ID and Google Workspace.

The browser-facing Next.js callback exchanges the authorization code with the
identity provider and sends only the short-lived provider access token here.
FutureHR then verifies identity against the provider userinfo endpoint and maps
email -> active tenant user before issuing normal FutureHR JWT tokens.
"""
from __future__ import annotations

from datetime import datetime, timezone

import requests
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.auth import ensure_secure_auth_enabled
from core.database import get_db
from db.models import TenantModel, UserModel
from routers.auth_v1 import TokenResponse, _tokens

router = APIRouter(prefix="/api/v1/auth/sso", tags=["SaaS SSO"])

USERINFO = {
    "google": "https://openidconnect.googleapis.com/v1/userinfo",
    "entra": "https://graph.microsoft.com/oidc/userinfo",
}


class SSOExchangeRequest(BaseModel):
    provider: str = Field(pattern="^(google|entra)$")
    tenant_slug: str = Field(min_length=2, max_length=80)
    access_token: str = Field(min_length=20, max_length=12000)


def _provider_identity(provider: str, access_token: str) -> dict:
    url = USERINFO.get(provider)
    if not url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported SSO provider")
    try:
        response = requests.get(url, headers={"Authorization": f"Bearer {access_token}"}, timeout=10)
    except requests.RequestException as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Identity provider verification unavailable") from exc
    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identity provider token could not be verified")
    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid identity provider response") from exc
    email = str(payload.get("email") or payload.get("preferred_username") or "").strip().lower()
    subject = str(payload.get("sub") or "").strip()
    if not email or not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Verified SSO identity does not include email/subject")
    if payload.get("email_verified") is False:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="SSO email is not verified")
    return {"email": email, "subject": subject, "name": payload.get("name")}


@router.get("/status")
def sso_status():
    return {"providers": ["google", "entra"], "mapping": "verified email -> active tenant user", "password_fallback": True}


@router.post("/exchange", response_model=TokenResponse)
def exchange(payload: SSOExchangeRequest, db: Session = Depends(get_db)):
    ensure_secure_auth_enabled()
    identity = _provider_identity(payload.provider, payload.access_token)
    tenant = db.scalar(select(TenantModel).where(func.lower(TenantModel.slug) == payload.tenant_slug.strip().lower(), TenantModel.status == "ACTIVE"))
    if not tenant:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid company or SSO identity")

    user = db.scalar(select(UserModel).where(
        UserModel.tenant_id == tenant.id,
        func.lower(UserModel.email) == identity["email"],
        UserModel.active.is_(True),
    ))
    if not user:
        # Fail closed: SSO never auto-provisions a new HR account or role.
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verified identity is not mapped to an active FutureHR user")

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return _tokens(user, tenant, db)
