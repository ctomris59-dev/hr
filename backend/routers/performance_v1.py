"""Tenant-scoped performance evaluation API for FutureHR SaaS mode."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from core.auth import Principal, require_roles
from core.database import get_db
from db.models import EmployeeModel, PerformanceEvaluationModel

router = APIRouter(prefix="/api/v1/performance", tags=["SaaS Performance"])
ALL_ROLES = ("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER", "PERSONEL", "EMPLOYEE")
MANAGER_ROLES = {"CEO", "DIRECTOR", "MANAGER"}
HR_ROLES = {"IK", "HR_ADMIN"}


class KpiItemInput(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=240)
    weight: float = Field(gt=0, le=100)
    score: float = Field(ge=1, le=5)


class EvaluationCreate(BaseModel):
    employee_id: str
    performance_model_version: str | None = Field(default=None, max_length=80)
    kpi_items: list[KpiItemInput] = Field(min_length=1, max_length=20)
    manager_performance_score: float = Field(ge=1, le=5)
    manager_scores: dict[str, float]
    note: str | None = Field(default=None, max_length=4000)
    is_star_performer: bool = False


class PerformanceTargetView(BaseModel):
    id: str
    full_name: str
    department: str | None = None
    position: str | None = None
    manager_employee_id: str | None = None
    second_manager_employee_id: str | None = None
    can_evaluate: bool
    relation: str | None = None


class EvaluationView(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    evaluator: str | None = None
    evaluation_type: str
    authority_context: dict[str, Any]
    date: datetime
    performance_model_version: str | None = None
    kpi_items: list[dict[str, Any]]
    kpi_score: float | None = None
    manager_performance_score: float | None = None
    performance_weights: dict[str, Any]
    performance: float
    competency_score: float | None = None
    manager_scores: dict[str, Any]
    note: str | None = None
    is_star_performer: bool


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


def _relation(principal: Principal, employee: EmployeeModel) -> str | None:
    if not principal.employee_id:
        return None
    if employee.manager_employee_id == principal.employee_id:
        return "Yönetici 1"
    if employee.second_manager_employee_id == principal.employee_id:
        return "Yönetici 2"
    return None


def _can_view(principal: Principal, employee: EmployeeModel) -> bool:
    role = principal.role.upper()
    if role in HR_ROLES:
        return True
    if role in MANAGER_ROLES:
        return _relation(principal, employee) is not None
    return bool(principal.employee_id and employee.id == principal.employee_id)


def _target_rows(principal: Principal, db: Session) -> list[EmployeeModel]:
    role = principal.role.upper()
    base = select(EmployeeModel).where(
        EmployeeModel.tenant_id == principal.tenant_id,
        EmployeeModel.active.is_(True),
    )
    if role in HR_ROLES:
        query = base
    elif role in MANAGER_ROLES:
        if not principal.employee_id:
            return []
        query = base.where(
            or_(
                EmployeeModel.manager_employee_id == principal.employee_id,
                EmployeeModel.second_manager_employee_id == principal.employee_id,
            )
        )
    else:
        if not principal.employee_id:
            return []
        query = base.where(EmployeeModel.id == principal.employee_id)
    return list(db.scalars(query.order_by(EmployeeModel.full_name)).all())


def _evaluation_view(row: PerformanceEvaluationModel, employee: EmployeeModel) -> EvaluationView:
    return EvaluationView(
        id=row.id,
        employee_id=row.employee_id,
        employee_name=employee.full_name,
        evaluator=row.evaluator_name,
        evaluation_type=row.evaluation_type,
        authority_context=row.authority_context_json or {},
        date=row.evaluated_at,
        performance_model_version=row.performance_model_version,
        kpi_items=row.kpi_items_json or [],
        kpi_score=row.kpi_score,
        manager_performance_score=row.manager_performance_score,
        performance_weights=row.performance_weights_json or {},
        performance=row.final_score,
        competency_score=row.competency_score,
        manager_scores=row.manager_scores_json or {},
        note=row.note,
        is_star_performer=row.is_star_performer,
    )


@router.get("/targets", response_model=list[PerformanceTargetView])
def performance_targets(
    principal: Principal = Depends(require_roles(*ALL_ROLES)),
    db: Session = Depends(get_db),
):
    role = principal.role.upper()
    rows = _target_rows(principal, db)
    return [
        PerformanceTargetView(
            id=employee.id,
            full_name=employee.full_name,
            department=employee.department,
            position=employee.position,
            manager_employee_id=employee.manager_employee_id,
            second_manager_employee_id=employee.second_manager_employee_id,
            can_evaluate=role in MANAGER_ROLES and _relation(principal, employee) is not None,
            relation=_relation(principal, employee) if role in MANAGER_ROLES else ("İK İzleme" if role in HR_ROLES else "Kendi Kaydı"),
        )
        for employee in rows
    ]


@router.get("/evaluations", response_model=list[EvaluationView])
def list_evaluations(
    employee_id: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    principal: Principal = Depends(require_roles(*ALL_ROLES)),
    db: Session = Depends(get_db),
):
    if employee_id:
        employee = _employee_for_tenant(db, principal.tenant_id, employee_id)
        if not _can_view(principal, employee):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Performance record is outside your scope")
        employee_ids = [employee.id]
        employees = {employee.id: employee}
    else:
        target_rows = _target_rows(principal, db)
        employee_ids = [employee.id for employee in target_rows]
        employees = {employee.id: employee for employee in target_rows}

    if not employee_ids:
        return []
    rows = db.scalars(
        select(PerformanceEvaluationModel)
        .where(
            PerformanceEvaluationModel.tenant_id == principal.tenant_id,
            PerformanceEvaluationModel.employee_id.in_(employee_ids),
        )
        .order_by(PerformanceEvaluationModel.evaluated_at.desc())
        .limit(limit)
    ).all()
    return [_evaluation_view(row, employees[row.employee_id]) for row in rows if row.employee_id in employees]


@router.post("/evaluations", response_model=EvaluationView, status_code=status.HTTP_201_CREATED)
def create_evaluation(
    payload: EvaluationCreate,
    principal: Principal = Depends(require_roles("CEO", "DIRECTOR", "MANAGER")),
    db: Session = Depends(get_db),
):
    employee = _employee_for_tenant(db, principal.tenant_id, payload.employee_id)
    relation = _relation(principal, employee)
    if not relation:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee is not in your direct evaluation scope")

    total_weight = round(sum(item.weight for item in payload.kpi_items), 4)
    if abs(total_weight - 100) > 0.01:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="KPI weights must total 100")

    competency_values = [float(value) for value in payload.manager_scores.values()]
    if len(competency_values) != 10 or any(value < 1 or value > 5 for value in competency_values):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Exactly 10 competency scores between 1 and 5 are required")

    kpi_score = round(sum(item.score * item.weight for item in payload.kpi_items) / total_weight, 2)
    manager_score = round(float(payload.manager_performance_score), 2)
    final_score = round(kpi_score * 0.6 + manager_score * 0.4, 2)
    competency_score = round(sum(competency_values) / len(competency_values), 2)

    evaluator_name = principal.username
    if principal.employee_id:
        evaluator = db.scalar(
            select(EmployeeModel).where(
                EmployeeModel.id == principal.employee_id,
                EmployeeModel.tenant_id == principal.tenant_id,
            )
        )
        if evaluator:
            evaluator_name = evaluator.full_name

    row = PerformanceEvaluationModel(
        tenant_id=principal.tenant_id,
        employee_id=employee.id,
        evaluator_user_id=principal.user_id,
        evaluator_name=evaluator_name,
        evaluation_type=relation,
        authority_context_json={"relation": relation, "override": False, "role": principal.role},
        evaluated_at=datetime.now(timezone.utc),
        performance_model_version=payload.performance_model_version,
        kpi_items_json=[item.model_dump() for item in payload.kpi_items],
        kpi_score=kpi_score,
        manager_performance_score=manager_score,
        performance_weights_json={"kpi": 0.6, "manager": 0.4},
        final_score=final_score,
        competency_score=competency_score,
        manager_scores_json={key: float(value) for key, value in payload.manager_scores.items()},
        note=payload.note.strip() if payload.note else None,
        is_star_performer=payload.is_star_performer,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _evaluation_view(row, employee)
