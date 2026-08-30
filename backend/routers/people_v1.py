"""Tenant-scoped employee master endpoints for the new SaaS data layer."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.auth import Principal, require_roles
from core.database import get_db
from db.models import EmployeeModel

router = APIRouter(prefix="/api/v1/employees", tags=["SaaS Employees"])


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


class EmployeeView(EmployeeCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    active: bool


def _validate_manager_reference(db: Session, *, tenant_id: str, employee_id: str | None, field_name: str) -> None:
    if not employee_id:
        return
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


@router.get("", response_model=list[EmployeeView])
def list_employees(
    principal: Principal = Depends(require_roles("CEO", "IK")),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(EmployeeModel)
        .where(EmployeeModel.tenant_id == principal.tenant_id, EmployeeModel.active.is_(True))
        .order_by(EmployeeModel.full_name)
    ).all()
    return rows


@router.post("", response_model=EmployeeView, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    principal: Principal = Depends(require_roles("CEO", "IK")),
    db: Session = Depends(get_db),
):
    if payload.external_id:
        existing = db.scalar(
            select(EmployeeModel).where(
                EmployeeModel.tenant_id == principal.tenant_id,
                EmployeeModel.external_id == payload.external_id,
            )
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee external ID already exists")

    _validate_manager_reference(db, tenant_id=principal.tenant_id, employee_id=payload.manager_employee_id, field_name="manager_employee_id")
    _validate_manager_reference(db, tenant_id=principal.tenant_id, employee_id=payload.second_manager_employee_id, field_name="second_manager_employee_id")

    employee = EmployeeModel(tenant_id=principal.tenant_id, **payload.model_dump())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee
