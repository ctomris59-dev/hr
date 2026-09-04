"""Tenant-scoped employee master endpoints for the FutureHR SaaS data layer."""
from __future__ import annotations

import base64
import binascii
import re
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from core.auth import Principal, require_roles
from core.database import get_db
from db.models import EmployeeModel

router = APIRouter(prefix="/api/v1/employees", tags=["SaaS Employees"])
EXECUTIVE_ROLES = ("CEO", "IK")
MANAGEMENT_ROLES = ("CEO", "IK", "DIRECTOR", "MANAGER")
ALL_ROLES = ("CEO", "IK", "DIRECTOR", "MANAGER", "PERSONEL", "EMPLOYEE")
AVATAR_MAX_BYTES = 2 * 1024 * 1024
AVATAR_MAX_DATA_URL_CHARS = 3_000_000
AVATAR_KEY = "avatar_data_url"
AVATAR_DATA_URL_RE = re.compile(r"^data:(image/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$", re.IGNORECASE)


def _decode_avatar_data_url(value: str) -> tuple[str, bytes]:
    match = AVATAR_DATA_URL_RE.fullmatch(value.strip())
    if not match:
        raise ValueError("Avatar must be a base64 JPEG, PNG or WebP data URL")
    mime = match.group(1).lower()
    try:
        raw = base64.b64decode(match.group(2), validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Avatar contains invalid base64 data") from exc
    if not raw:
        raise ValueError("Avatar image cannot be empty")
    if len(raw) > AVATAR_MAX_BYTES:
        raise ValueError("Avatar image must be 2 MB or smaller")

    valid_signature = (
        (mime == "image/jpeg" and raw.startswith(b"\xff\xd8\xff"))
        or (mime == "image/png" and raw.startswith(b"\x89PNG\r\n\x1a\n"))
        or (mime == "image/webp" and len(raw) >= 12 and raw.startswith(b"RIFF") and raw[8:12] == b"WEBP")
    )
    if not valid_signature:
        raise ValueError("Avatar image signature does not match its declared type")
    return mime, raw


class EmployeeCreate(BaseModel):
    external_id: str | None = Field(default=None, max_length=80)
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr | None = None
    department: str | None = Field(default=None, max_length=160)
    position: str | None = Field(default=None, max_length=200)
    job_family: str | None = Field(default=None, max_length=160)
    job_level: str | None = Field(default=None, max_length=24)
    manager_employee_id: str | None = None
    second_manager_employee_id: str | None = None
    hire_date: date | None = None
    employment_type: str | None = Field(default=None, max_length=48)
    location: str | None = Field(default=None, max_length=160)


class EmployeeUpdate(BaseModel):
    external_id: str | None = Field(default=None, max_length=80)
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    email: EmailStr | None = None
    department: str | None = Field(default=None, max_length=160)
    position: str | None = Field(default=None, max_length=200)
    job_family: str | None = Field(default=None, max_length=160)
    job_level: str | None = Field(default=None, max_length=24)
    manager_employee_id: str | None = None
    second_manager_employee_id: str | None = None
    hire_date: date | None = None
    employment_type: str | None = Field(default=None, max_length=48)
    location: str | None = Field(default=None, max_length=160)
    avatar_data_url: str | None = Field(default=None, max_length=AVATAR_MAX_DATA_URL_CHARS)

    @field_validator("avatar_data_url")
    @classmethod
    def validate_avatar_data_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        _decode_avatar_data_url(normalized)
        return normalized


class EmployeeView(EmployeeCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    active: bool
    metadata_json: dict[str, Any] = Field(default_factory=dict, exclude=True)

    @computed_field
    @property
    def has_avatar(self) -> bool:
        return bool((self.metadata_json or {}).get(AVATAR_KEY))


def _employee_for_tenant(db: Session, *, tenant_id: str, employee_id: str, active_only: bool = True) -> EmployeeModel:
    clauses = [EmployeeModel.id == employee_id, EmployeeModel.tenant_id == tenant_id]
    if active_only:
        clauses.append(EmployeeModel.active.is_(True))
    employee = db.scalar(select(EmployeeModel).where(*clauses))
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee


def _validate_manager_reference(
    db: Session,
    *,
    tenant_id: str,
    employee_id: str | None,
    field_name: str,
    subject_employee_id: str | None = None,
) -> None:
    if not employee_id:
        return
    if subject_employee_id and employee_id == subject_employee_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field_name} cannot reference the employee itself")
    manager = db.scalar(
        select(EmployeeModel.id).where(
            EmployeeModel.id == employee_id,
            EmployeeModel.tenant_id == tenant_id,
            EmployeeModel.active.is_(True),
        )
    )
    if not manager:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must reference an active employee in the same company",
        )


def _validate_external_id(db: Session, *, tenant_id: str, external_id: str | None, exclude_employee_id: str | None = None) -> None:
    if not external_id:
        return
    query = select(EmployeeModel.id).where(
        EmployeeModel.tenant_id == tenant_id,
        EmployeeModel.external_id == external_id,
    )
    if exclude_employee_id:
        query = query.where(EmployeeModel.id != exclude_employee_id)
    if db.scalar(query):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee external ID already exists")


def _validate_manager_pair(manager1: str | None, manager2: str | None) -> None:
    if manager1 and manager2 and manager1 == manager2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Primary and secondary manager must be different employees")


def _store_avatar(employee: EmployeeModel, avatar_data_url: str | None) -> None:
    metadata = dict(employee.metadata_json or {})
    if avatar_data_url:
        metadata[AVATAR_KEY] = avatar_data_url
    else:
        metadata.pop(AVATAR_KEY, None)
    employee.metadata_json = metadata


def _assert_avatar_view_access(principal: Principal, employee: EmployeeModel) -> None:
    role = principal.role.upper()
    if role in EXECUTIVE_ROLES or employee.id == principal.employee_id:
        return
    if role in ("DIRECTOR", "MANAGER") and principal.employee_id and (
        employee.manager_employee_id == principal.employee_id
        or employee.second_manager_employee_id == principal.employee_id
    ):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this employee avatar")


@router.get("", response_model=list[EmployeeView])
def list_employees(
    principal: Principal = Depends(require_roles(*EXECUTIVE_ROLES)),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(EmployeeModel)
        .where(EmployeeModel.tenant_id == principal.tenant_id, EmployeeModel.active.is_(True))
        .order_by(EmployeeModel.full_name)
    ).all()


@router.get("/me", response_model=EmployeeView)
def my_employee_record(
    principal: Principal = Depends(require_roles(*ALL_ROLES)),
    db: Session = Depends(get_db),
):
    if not principal.employee_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No employee record is linked to this user")
    return _employee_for_tenant(db, tenant_id=principal.tenant_id, employee_id=principal.employee_id)


@router.get("/team", response_model=list[EmployeeView])
def my_team(
    principal: Principal = Depends(require_roles(*MANAGEMENT_ROLES)),
    db: Session = Depends(get_db),
):
    if principal.role.upper() in EXECUTIVE_ROLES:
        return db.scalars(
            select(EmployeeModel)
            .where(EmployeeModel.tenant_id == principal.tenant_id, EmployeeModel.active.is_(True))
            .order_by(EmployeeModel.full_name)
        ).all()
    if not principal.employee_id:
        return []
    return db.scalars(
        select(EmployeeModel)
        .where(
            EmployeeModel.tenant_id == principal.tenant_id,
            EmployeeModel.active.is_(True),
            or_(
                EmployeeModel.manager_employee_id == principal.employee_id,
                EmployeeModel.second_manager_employee_id == principal.employee_id,
            ),
        )
        .order_by(EmployeeModel.full_name)
    ).all()


@router.get("/{employee_id}/avatar")
def get_employee_avatar(
    employee_id: str,
    principal: Principal = Depends(require_roles(*ALL_ROLES)),
    db: Session = Depends(get_db),
):
    employee = _employee_for_tenant(db, tenant_id=principal.tenant_id, employee_id=employee_id)
    _assert_avatar_view_access(principal, employee)
    avatar_data_url = str((employee.metadata_json or {}).get(AVATAR_KEY) or "")
    if not avatar_data_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee avatar not found")
    try:
        mime, raw = _decode_avatar_data_url(avatar_data_url)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee avatar not found") from exc
    return Response(
        content=raw,
        media_type=mime,
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )


@router.get("/{employee_id}", response_model=EmployeeView)
def get_employee(
    employee_id: str,
    principal: Principal = Depends(require_roles(*EXECUTIVE_ROLES)),
    db: Session = Depends(get_db),
):
    return _employee_for_tenant(db, tenant_id=principal.tenant_id, employee_id=employee_id)


@router.post("", response_model=EmployeeView, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    principal: Principal = Depends(require_roles(*EXECUTIVE_ROLES)),
    db: Session = Depends(get_db),
):
    _validate_external_id(db, tenant_id=principal.tenant_id, external_id=payload.external_id)
    _validate_manager_pair(payload.manager_employee_id, payload.second_manager_employee_id)
    _validate_manager_reference(db, tenant_id=principal.tenant_id, employee_id=payload.manager_employee_id, field_name="manager_employee_id")
    _validate_manager_reference(db, tenant_id=principal.tenant_id, employee_id=payload.second_manager_employee_id, field_name="second_manager_employee_id")

    employee = EmployeeModel(tenant_id=principal.tenant_id, **payload.model_dump())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.patch("/{employee_id}", response_model=EmployeeView)
def update_employee(
    employee_id: str,
    payload: EmployeeUpdate,
    principal: Principal = Depends(require_roles(*EXECUTIVE_ROLES)),
    db: Session = Depends(get_db),
):
    employee = _employee_for_tenant(db, tenant_id=principal.tenant_id, employee_id=employee_id)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return employee

    avatar_supplied = "avatar_data_url" in updates
    avatar_data_url = updates.pop("avatar_data_url", None)

    if "external_id" in updates:
        _validate_external_id(db, tenant_id=principal.tenant_id, external_id=updates.get("external_id"), exclude_employee_id=employee.id)

    manager1 = updates.get("manager_employee_id", employee.manager_employee_id)
    manager2 = updates.get("second_manager_employee_id", employee.second_manager_employee_id)
    _validate_manager_pair(manager1, manager2)
    if "manager_employee_id" in updates:
        _validate_manager_reference(db, tenant_id=principal.tenant_id, employee_id=manager1, field_name="manager_employee_id", subject_employee_id=employee.id)
    if "second_manager_employee_id" in updates:
        _validate_manager_reference(db, tenant_id=principal.tenant_id, employee_id=manager2, field_name="second_manager_employee_id", subject_employee_id=employee.id)

    for key, value in updates.items():
        setattr(employee, key, value)
    if avatar_supplied:
        _store_avatar(employee, avatar_data_url)
    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_employee(
    employee_id: str,
    principal: Principal = Depends(require_roles(*EXECUTIVE_ROLES)),
    db: Session = Depends(get_db),
):
    employee = _employee_for_tenant(db, tenant_id=principal.tenant_id, employee_id=employee_id)
    employee.active = False
    db.commit()
    return None
