"""Server-side access-policy rules and safe role ceilings.

The browser is never trusted to decide how far a role may be widened. A company
may customize its policy only inside these ceilings; reducing access is always
allowed. Existing SaaS route guards remain an additional enforcement layer.
"""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from db.models import TenantModel

POLICY_SETTINGS_KEY = "access_policy_v3"
ROLE_KEYS = {"ceo", "hr_admin", "director", "manager", "employee"}
RESOURCE_KEYS = {"people", "profile", "performance", "leave", "development", "training", "experience", "recruitment", "salary", "talent", "succession"}
DOCUMENT_KEYS = {"employmentContract", "payroll", "identity", "bank", "medical", "leaveAttachment", "disciplinary", "performanceForm", "trainingCertificate", "candidateCv"}
ACTIONS = {"view", "create", "edit", "approve", "export"}
SCOPES = {"NONE", "SELF", "DIRECT_REPORTS", "DEPARTMENT", "COMPANY", "ASSIGNED", "AGGREGATE"}

GENERIC_SCOPE_CAPS = {
    "ceo": {"NONE", "SELF", "DIRECT_REPORTS", "DEPARTMENT", "COMPANY"},
    "hr_admin": {"NONE", "SELF", "DIRECT_REPORTS", "DEPARTMENT", "COMPANY"},
    "director": {"NONE", "SELF", "DIRECT_REPORTS", "DEPARTMENT"},
    "manager": {"NONE", "SELF", "DIRECT_REPORTS"},
    "employee": {"NONE", "SELF"},
}


def frontend_role_key(role: str) -> str:
    normalized = str(role or "").upper()
    if normalized == "CEO":
        return "ceo"
    if normalized in {"IK", "HR_ADMIN", "HR"}:
        return "hr_admin"
    if normalized in {"DIRECTOR", "DIREKTÖR", "DIREKTOR"}:
        return "director"
    if normalized in {"MANAGER", "MÜDÜR", "MUDUR"}:
        return "manager"
    return "employee"


def allowed_resource_scopes(role: str, resource: str) -> set[str]:
    if resource == "experience":
        return {"NONE", "SELF"} if role == "employee" else {"NONE", "AGGREGATE"}
    if resource == "recruitment":
        if role in {"ceo", "hr_admin"}:
            return {"NONE", "ASSIGNED", "DEPARTMENT", "COMPANY"}
        if role in {"director", "manager"}:
            return {"NONE", "ASSIGNED"}
        return {"NONE"}
    if resource == "salary":
        if role in {"ceo", "hr_admin"}:
            return {"NONE", "SELF", "DIRECT_REPORTS", "DEPARTMENT", "COMPANY"}
        if role == "director":
            return {"NONE", "DEPARTMENT"}
        if role == "manager":
            return {"NONE", "DIRECT_REPORTS"}
        return {"NONE", "SELF"}
    if resource in {"talent", "succession"}:
        if role in {"ceo", "hr_admin"}:
            return {"NONE", "SELF", "DIRECT_REPORTS", "DEPARTMENT", "COMPANY"}
        if role == "director":
            return {"NONE", "DEPARTMENT"}
        if role == "manager":
            return {"NONE", "DIRECT_REPORTS"}
        return {"NONE"}
    return set(GENERIC_SCOPE_CAPS[role])


def allowed_resource_actions(role: str, resource: str) -> set[str]:
    if role in {"ceo", "hr_admin"}:
        return set(ACTIONS)
    if role == "director":
        if resource == "performance": return {"view", "edit", "approve", "export"}
        if resource == "leave": return {"view", "approve"}
        if resource == "development": return {"view", "edit"}
        if resource == "recruitment": return {"view", "approve"}
        return {"view", "export"}
    if role == "manager":
        if resource == "performance": return {"view", "edit", "approve"}
        if resource == "leave": return {"view", "approve"}
        if resource == "development": return {"view", "edit"}
        if resource == "recruitment": return {"view", "approve"}
        return {"view"}
    if resource == "profile": return {"view", "edit"}
    if resource == "leave": return {"view", "create", "edit"}
    if resource == "development": return {"view", "edit"}
    if resource == "experience": return {"view", "create"}
    if resource == "salary": return {"view", "export"}
    if resource in {"people", "performance", "training"}: return {"view"}
    return set()


def allowed_document_scopes(role: str, document: str) -> set[str]:
    if document == "candidateCv":
        return allowed_resource_scopes(role, "recruitment")
    if document in {"performanceForm", "trainingCertificate"}:
        return set(GENERIC_SCOPE_CAPS[role])
    if document == "disciplinary":
        return {"NONE", "COMPANY"} if role in {"ceo", "hr_admin"} else {"NONE"}
    if role in {"ceo", "hr_admin"}:
        return {"NONE", "COMPANY"}
    if role == "employee":
        return {"NONE", "SELF"}
    return {"NONE"}


def allowed_document_actions(role: str, document: str) -> set[str]:
    if role in {"ceo", "hr_admin"}:
        return set(ACTIONS)
    if role in {"director", "manager"}:
        return {"view", "export"}
    if document == "bank": return {"view", "edit"}
    if document == "leaveAttachment": return {"view", "create"}
    if document == "trainingCertificate": return {"view", "create", "export"}
    if document in {"employmentContract", "payroll", "performanceForm"}: return {"view", "export"}
    if document in {"identity", "medical"}: return {"view"}
    return set()


def _validate_entry(role: str, key: str, entry: dict[str, Any], *, document: bool) -> None:
    scope = entry.get("scope")
    actions = entry.get("actions")
    if scope is not None:
        if scope not in SCOPES:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unsupported scope: {scope}")
        allowed_scopes = allowed_document_scopes(role, key) if document else allowed_resource_scopes(role, key)
        if scope not in allowed_scopes:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"{role} cannot be widened to {scope} for {key}")
    if actions is not None:
        unknown = set(actions) - ACTIONS
        if unknown:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unsupported action: {sorted(unknown)[0]}")
        allowed_actions = allowed_document_actions(role, key) if document else allowed_resource_actions(role, key)
        disallowed = set(actions) - allowed_actions
        if disallowed:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"{role} cannot perform {sorted(disallowed)[0]} on {key}")
        if scope == "NONE" and actions:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"NONE scope cannot contain actions for {key}")


def validate_company_policy(policy: dict[str, Any]) -> None:
    if policy.get("version") != 3:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Access policy version 3 is required")
    for section, valid_keys, is_document in (
        ("resourceOverrides", RESOURCE_KEYS, False),
        ("documentOverrides", DOCUMENT_KEYS, True),
    ):
        role_map = policy.get(section) or {}
        for role, entries in role_map.items():
            if role not in ROLE_KEYS:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unsupported role: {role}")
            for key, entry in (entries or {}).items():
                if key not in valid_keys:
                    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unsupported permission key: {key}")
                _validate_entry(role, key, dict(entry or {}), document=is_document)


def load_tenant_policy(db: Session, tenant_id: str) -> dict[str, Any] | None:
    tenant = db.scalar(select(TenantModel).where(TenantModel.id == tenant_id, TenantModel.status == "ACTIVE"))
    if tenant is None:
        return None
    settings = dict(tenant.settings_json or {})
    value = settings.get(POLICY_SETTINGS_KEY)
    return dict(value) if isinstance(value, dict) else None


def effective_resource_override(db: Session, tenant_id: str, role: str, resource: str) -> dict[str, Any] | None:
    policy = load_tenant_policy(db, tenant_id)
    if not policy:
        return None
    role_key = frontend_role_key(role)
    value = (((policy.get("resourceOverrides") or {}).get(role_key) or {}).get(resource))
    return dict(value) if isinstance(value, dict) else None
