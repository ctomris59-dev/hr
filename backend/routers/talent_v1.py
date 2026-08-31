"""Tenant-scoped talent dataset and profile signals for FutureHR SaaS mode."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.auth import Principal, require_roles
from core.database import get_db
from db.models import EmployeeModel, PerformanceEvaluationModel, TalentProfileModel

router = APIRouter(prefix="/api/v1/talent", tags=["SaaS Talent"])
TALENT_ROLES = ("CEO", "IK", "HR_ADMIN")


class TalentProfileUpdate(BaseModel):
    career_aspiration: float | None = Field(default=None, ge=1, le=5)
    mobility_willingness: float | None = Field(default=None, ge=1, le=5)


class TalentProfileView(BaseModel):
    employee_id: str
    career_aspiration: float | None = None
    mobility_willingness: float | None = None


class TalentEmployeeView(BaseModel):
    id: str
    full_name: str
    department: str | None = None
    position: str | None = None
    manager_employee_id: str | None = None
    second_manager_employee_id: str | None = None
    job_family: str | None = None
    job_level: str | None = None
    profile: TalentProfileView


class TalentEvaluationView(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    date: str
    performance_model_version: str | None = None
    kpi_items: list[dict[str, Any]]
    kpi_score: float | None = None
    manager_performance_score: float | None = None
    performance: float
    competency_score: float | None = None
    manager_scores: dict[str, Any]
    note: str | None = None
    is_star_performer: bool


class TalentDatasetView(BaseModel):
    employees: list[TalentEmployeeView]
    evaluations: list[TalentEvaluationView]


def _employee_for_tenant(db: Session, tenant_id: str, employee_id: str) -> EmployeeModel:
    employee = db.scalar(
        select(EmployeeModel).where(
            EmployeeModel.id == employee_id,
            EmployeeModel.tenant_id == tenant_id,
            EmployeeModel.active.is_(True),
        )
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee


@router.get("/dataset", response_model=TalentDatasetView)
def talent_dataset(
    principal: Principal = Depends(require_roles(*TALENT_ROLES)),
    db: Session = Depends(get_db),
):
    employees = list(
        db.scalars(
            select(EmployeeModel)
            .where(EmployeeModel.tenant_id == principal.tenant_id, EmployeeModel.active.is_(True))
            .order_by(EmployeeModel.full_name)
        ).all()
    )
    employee_ids = [employee.id for employee in employees]
    profiles = {
        profile.employee_id: profile
        for profile in db.scalars(
            select(TalentProfileModel).where(TalentProfileModel.tenant_id == principal.tenant_id)
        ).all()
    }

    evaluation_rows = []
    if employee_ids:
        evaluation_rows = list(
            db.scalars(
                select(PerformanceEvaluationModel)
                .where(
                    PerformanceEvaluationModel.tenant_id == principal.tenant_id,
                    PerformanceEvaluationModel.employee_id.in_(employee_ids),
                )
                .order_by(PerformanceEvaluationModel.evaluated_at.desc())
                .limit(1000)
            ).all()
        )
    employee_names = {employee.id: employee.full_name for employee in employees}

    return TalentDatasetView(
        employees=[
            TalentEmployeeView(
                id=employee.id,
                full_name=employee.full_name,
                department=employee.department,
                position=employee.position,
                manager_employee_id=employee.manager_employee_id,
                second_manager_employee_id=employee.second_manager_employee_id,
                job_family=employee.job_family,
                job_level=employee.job_level,
                profile=TalentProfileView(
                    employee_id=employee.id,
                    career_aspiration=profiles.get(employee.id).career_aspiration if profiles.get(employee.id) else None,
                    mobility_willingness=profiles.get(employee.id).mobility_willingness if profiles.get(employee.id) else None,
                ),
            )
            for employee in employees
        ],
        evaluations=[
            TalentEvaluationView(
                id=row.id,
                employee_id=row.employee_id,
                employee_name=employee_names.get(row.employee_id, ""),
                date=row.evaluated_at.isoformat(),
                performance_model_version=row.performance_model_version,
                kpi_items=row.kpi_items_json or [],
                kpi_score=row.kpi_score,
                manager_performance_score=row.manager_performance_score,
                performance=row.final_score,
                competency_score=row.competency_score,
                manager_scores=row.manager_scores_json or {},
                note=row.note,
                is_star_performer=row.is_star_performer,
            )
            for row in evaluation_rows
            if row.employee_id in employee_names
        ],
    )


@router.patch("/profiles/{employee_id}", response_model=TalentProfileView)
def update_talent_profile(
    employee_id: str,
    payload: TalentProfileUpdate,
    principal: Principal = Depends(require_roles(*TALENT_ROLES)),
    db: Session = Depends(get_db),
):
    _employee_for_tenant(db, principal.tenant_id, employee_id)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        existing = db.scalar(
            select(TalentProfileModel).where(
                TalentProfileModel.tenant_id == principal.tenant_id,
                TalentProfileModel.employee_id == employee_id,
            )
        )
        return TalentProfileView(
            employee_id=employee_id,
            career_aspiration=existing.career_aspiration if existing else None,
            mobility_willingness=existing.mobility_willingness if existing else None,
        )

    profile = db.scalar(
        select(TalentProfileModel).where(
            TalentProfileModel.tenant_id == principal.tenant_id,
            TalentProfileModel.employee_id == employee_id,
        )
    )
    if not profile:
        profile = TalentProfileModel(
            tenant_id=principal.tenant_id,
            employee_id=employee_id,
            updated_by_user_id=principal.user_id,
        )
        db.add(profile)

    for key, value in updates.items():
        setattr(profile, key, value)
    profile.updated_by_user_id = principal.user_id
    db.commit()
    db.refresh(profile)
    return TalentProfileView(
        employee_id=profile.employee_id,
        career_aspiration=profile.career_aspiration,
        mobility_willingness=profile.mobility_willingness,
    )
