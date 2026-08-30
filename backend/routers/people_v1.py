"""Tenant-scoped employee master endpoints for the FutureHR SaaS data layer."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from core.auth import Principal, require_roles
from core.database import get_db
from db.models import EmployeeModel

router = APIRouter(prefix="/api/v1/employees", tags=["SaaS Employees"])
EXECUTIVE_ROLES = ("CEO", "IK")
MANAGEMENT_ROLES = ("CEO", "IK", "DIRECTOR", "MANAGER")
ALL_ROLES = ("CEO", "IK", "DIRECTOR", "MANAGER", "PERSONEL", "EMPLOYEE")


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


class EmployeeView(EmployeeCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    active: bool


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
