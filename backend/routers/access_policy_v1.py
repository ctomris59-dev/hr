"""Tenant-scoped access policy API for FutureHR.

The access policy is stored inside TenantModel.settings_json so companies can
customize permissions without a schema migration. Reads are available to every
authenticated company user; writes are restricted to CEO.
"""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.auth import Principal, require_roles
from core.database import get_db
from db.models import TenantModel

router = APIRouter(prefix="/api/v1/access", tags=["SaaS Access Policy"])
POLICY_SETTINGS_KEY = "access_policy_v3"
ALL_ROLES = ("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER", "PERSONEL", "EMPLOYEE")

DataScope = Literal["NONE", "SELF", "DIRECT_REPORTS", "DEPARTMENT", "COMPANY", "ASSIGNED", "AGGREGATE"]
AccessAction = Literal["view", "create", "edit", "approve", "export"]


class AccessEntry(BaseModel):
    scope: DataScope | None = None
    actions: list[AccessAction] | None = None


class PerformancePolicy(BaseModel):
    secondManagerCanEvaluate: bool = True
    hrCanOverride: bool = False
    hrOverrideRequiresReason: bool = True


class CompanyAccessPolicyPayload(BaseModel):
    version: Literal[3] = 3
    moduleOverrides: dict[str, dict[str, bool]] = Field(default_factory=dict)
    resourceOverrides: dict[str, dict[str, AccessEntry]] = Field(default_factory=dict)
    documentOverrides: dict[str, dict[str, AccessEntry]] = Field(default_factory=dict)
    performance: PerformancePolicy = Field(default_factory=PerformancePolicy)


def _tenant(db: Session, tenant_id: str) -> TenantModel:
    tenant = db.scalar(
        select(TenantModel).where(
            TenantModel.id == tenant_id,
            TenantModel.status == "ACTIVE",
        )
    )
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company account not found")
    return tenant


@router.get("/policy")
def get_access_policy(
    principal: Principal = Depends(require_roles(*ALL_ROLES)),
    db: Session = Depends(get_db),
):
    tenant = _tenant(db, principal.tenant_id)
    settings = dict(tenant.settings_json or {})
    return {"policy": settings.get(POLICY_SETTINGS_KEY)}


@router.put("/policy")
def save_access_policy(
    payload: CompanyAccessPolicyPayload,
    principal: Principal = Depends(require_roles("CEO")),
    db: Session = Depends(get_db),
):
    tenant = _tenant(db, principal.tenant_id)
    settings = dict(tenant.settings_json or {})
    settings[POLICY_SETTINGS_KEY] = payload.model_dump(mode="json")
    tenant.settings_json = settings
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return {"policy": settings[POLICY_SETTINGS_KEY], "saved": True}
