"""Tenant-scoped development, leave and compensation APIs for FutureHR SaaS mode."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from math import isfinite
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from core.auth import Principal, require_roles
from core.database import get_db
from db.models import (
    CompensationBenchmarkModel,
    CompensationCycleModel,
    DevelopmentPlanModel,
    DevelopmentTrainingAssignmentModel,
    EmployeeModel,
    LeaveRequestModel,
    PerformanceEvaluationModel,
    RewardLeaveGrantModel,
)

router = APIRouter(prefix="/api/v1", tags=["SaaS Workforce Operations"])
ALL_ROLES = ("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER", "PERSONEL", "EMPLOYEE")
MANAGEMENT_ROLES = {"CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER"}
EXECUTIVE_HR_ROLES = {"CEO", "IK", "HR_ADMIN"}
LINE_MANAGER_ROLES = {"DIRECTOR", "MANAGER"}
COMP_STAGES = ["DRAFT_SIMULATION", "MANAGER_INPUT", "BUDGET_REVIEW", "APPROVAL", "FINALIZED", "EFFECTIVE"]
LEAVE_TYPES = {"annual", "excuse", "unpaid", "reward", "sick"}


class EmployeeOpsView(BaseModel):
    id: str
    full_name: str
    department: str | None = None
    position: str | None = None
    manager_employee_id: str | None = None
    second_manager_employee_id: str | None = None
    hire_date: date | None = None
    salary_amount: float | None = None
    annual_leave_entitlement: float = 14.0


class DevelopmentPlanCreate(BaseModel):
    employee_id: str
    competency: str | None = Field(default=None, max_length=200)
    goal: str = Field(min_length=2, max_length=500)
    action: str = Field(min_length=2, max_length=8000)
    action_type: str = Field(min_length=2, max_length=80)
    success_metric: str = Field(min_length=2, max_length=4000)
    due_date: date | None = None
    intervention_id: str | None = Field(default=None, max_length=120)
    reassess_days: int | None = Field(default=60, ge=1, le=730)


class DevelopmentPlanPatch(BaseModel):
    status: Literal["Planlandı", "Devam Ediyor", "Tamamlandı"]


class DevelopmentPlanView(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    competency: str | None = None
    goal: str
    action: str
    action_type: str
    success_metric: str
    due_date: date | None = None
    status: str
    created_by: str | None = None
    created_at: datetime
    intervention_id: str | None = None
    reassess_days: int | None = None
    transferred_to_training: bool


class DevelopmentAssignmentView(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    training_id: str
    training_name: str
    source_development_plan_id: str
    assigned_by: str | None = None
    assigned_at: datetime
    due_date: date | None = None
    status: str
    competency_code: str | None = None
    transfer_task: str | None = None
    success_metric: str | None = None


class DevelopmentWorkspace(BaseModel):
    employees: list[EmployeeOpsView]
    plans: list[DevelopmentPlanView]
    assignments: list[DevelopmentAssignmentView]


class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    note: str | None = Field(default=None, max_length=4000)


class LeaveDecision(BaseModel):
    decision: Literal["Onaylandı", "Reddedildi"]


class RewardGrantCreate(BaseModel):
    employee_id: str
    days: float = Field(gt=0, le=30)
    reason: str = Field(min_length=2, max_length=4000)


class LeaveRequestView(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    department: str | None = None
    leave_type: str
    start_date: date
    end_date: date
    days: float
    status: str
    note: str | None = None
    created_at: datetime
    approved_by: str | None = None


class RewardGrantView(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    days: float
    reason: str
    granted_by: str | None = None
    created_at: datetime


class LeaveWorkspace(BaseModel):
    current_employee: EmployeeOpsView | None
    manageable_employees: list[EmployeeOpsView]
    requests: list[LeaveRequestView]
    rewards: list[RewardGrantView]


class BenchmarkUpsert(BaseModel):
    department: str = Field(min_length=1, max_length=160)
    position: str = Field(min_length=1, max_length=200)
    market_average: float = Field(gt=0)
    source: str | None = Field(default="Dış kaynak / kullanıcı girişi", max_length=240)


class BenchmarkView(BaseModel):
    id: str
    department: str
    position: str
    market_average: float
    source: str | None = None
    updated_at: datetime


class CycleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    budget_limit: float = Field(default=30, gt=0, le=100)


class CycleSimulationUpdate(BaseModel):
    scenario: Literal["A", "B", "C", "D"]
    inflation_rate: float = Field(ge=0, le=200)
    results: list[dict[str, Any]] = Field(default_factory=list, max_length=5000)


class ManagerRequestInput(BaseModel):
    employee_id: str
    rate: float = Field(ge=0, le=100)
    note: str = Field(min_length=2, max_length=2000)
    system_baseline: float | None = Field(default=None, ge=0)


class ManagerRequestsPayload(BaseModel):
    requests: list[ManagerRequestInput] = Field(min_length=1, max_length=500)


class CompensationCycleView(BaseModel):
    id: str
    name: str
    stage: str
    created_at: datetime
    effective_date: date | None = None
    manager_deadline: date | None = None
    budget_limit: float
    scenario: str | None = None
    inflation_rate: float | None = None
    results: list[dict[str, Any]]
    manager_requests: list[dict[str, Any]]
    approved_by: str | None = None
    finalized_at: datetime | None = None
    applied_at: datetime | None = None
    stage_history: list[dict[str, Any]]


class CompensationEvaluationView(BaseModel):
    employee_id: str
    employee_name: str
    date: datetime
    performance: float
    competency_score: float | None = None
    manager_scores: dict[str, Any]
    is_star_performer: bool


class CompensationWorkspace(BaseModel):
    employees: list[EmployeeOpsView]
    evaluations: list[CompensationEvaluationView]
    benchmarks: list[BenchmarkView]
    cycles: list[CompensationCycleView]


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


def _employee_view(employee: EmployeeModel) -> EmployeeOpsView:
    return EmployeeOpsView(
        id=employee.id,
        full_name=employee.full_name,
        department=employee.department,
        position=employee.position,
        manager_employee_id=employee.manager_employee_id,
        second_manager_employee_id=employee.second_manager_employee_id,
        hire_date=employee.hire_date,
        salary_amount=employee.salary_amount,
        annual_leave_entitlement=float(employee.annual_leave_entitlement or 14),
    )


def _relation(principal: Principal, employee: EmployeeModel) -> str | None:
    if not principal.employee_id:
        return None
    if employee.manager_employee_id == principal.employee_id:
        return "Yönetici 1"
    if employee.second_manager_employee_id == principal.employee_id:
        return "Yönetici 2"
    return None


def _can_manage(principal: Principal, employee: EmployeeModel) -> bool:
    role = principal.role.upper()
    if role in EXECUTIVE_HR_ROLES:
        return True
    return role in LINE_MANAGER_ROLES and _relation(principal, employee) is not None


def _scoped_employees(principal: Principal, db: Session, *, include_self_for_managers: bool = False) -> list[EmployeeModel]:
    base = select(EmployeeModel).where(
        EmployeeModel.tenant_id == principal.tenant_id,
        EmployeeModel.active.is_(True),
    )
    role = principal.role.upper()
    if role in EXECUTIVE_HR_ROLES:
        query = base
    elif role in LINE_MANAGER_ROLES:
        if not principal.employee_id:
            return []
        clauses = [
            EmployeeModel.manager_employee_id == principal.employee_id,
            EmployeeModel.second_manager_employee_id == principal.employee_id,
        ]
        if include_self_for_managers:
            clauses.append(EmployeeModel.id == principal.employee_id)
        query = base.where(or_(*clauses))
    else:
        if not principal.employee_id:
            return []
        query = base.where(EmployeeModel.id == principal.employee_id)
    return list(db.scalars(query.order_by(EmployeeModel.full_name)).all())


def _actor_name(principal: Principal, db: Session) -> str:
    if principal.employee_id:
        employee = db.scalar(
            select(EmployeeModel).where(
                EmployeeModel.id == principal.employee_id,
                EmployeeModel.tenant_id == principal.tenant_id,
            )
        )
        if employee:
            return employee.full_name
    return principal.username


def _plan_view(row: DevelopmentPlanModel, names: dict[str, str]) -> DevelopmentPlanView:
    return DevelopmentPlanView(
        id=row.id,
        employee_id=row.employee_id,
        employee_name=names.get(row.employee_id, ""),
        competency=row.competency,
        goal=row.goal,
        action=row.action,
        action_type=row.action_type,
        success_metric=row.success_metric,
        due_date=row.due_date,
        status=row.status,
        created_by=row.created_by_name,
        created_at=row.created_at,
        intervention_id=row.intervention_id,
        reassess_days=row.reassess_days,
        transferred_to_training=row.transferred_to_training,
    )


def _assignment_view(row: DevelopmentTrainingAssignmentModel, names: dict[str, str]) -> DevelopmentAssignmentView:
    return DevelopmentAssignmentView(
        id=row.id,
        employee_id=row.employee_id,
        employee_name=names.get(row.employee_id, ""),
        training_id=row.training_id,
        training_name=row.training_name,
        source_development_plan_id=row.source_development_plan_id,
        assigned_by=row.assigned_by_name,
        assigned_at=row.assigned_at,
        due_date=row.due_date,
        status=row.status,
        competency_code=row.competency_code,
        transfer_task=row.transfer_task,
        success_metric=row.success_metric,
    )


@router.get("/development/workspace", response_model=DevelopmentWorkspace)
def development_workspace(
    principal: Principal = Depends(require_roles(*ALL_ROLES)),
    db: Session = Depends(get_db),
):
    employees = _scoped_employees(principal, db)
    employee_ids = [employee.id for employee in employees]
    names = {employee.id: employee.full_name for employee in employees}
    if not employee_ids:
        return DevelopmentWorkspace(employees=[], plans=[], assignments=[])
    plans = db.scalars(
        select(DevelopmentPlanModel)
        .where(DevelopmentPlanModel.tenant_id == principal.tenant_id, DevelopmentPlanModel.employee_id.in_(employee_ids))
        .order_by(DevelopmentPlanModel.created_at.desc())
    ).all()
    assignments = db.scalars(
        select(DevelopmentTrainingAssignmentModel)
        .where(DevelopmentTrainingAssignmentModel.tenant_id == principal.tenant_id, DevelopmentTrainingAssignmentModel.employee_id.in_(employee_ids))
        .order_by(DevelopmentTrainingAssignmentModel.assigned_at.desc())
    ).all()
    return DevelopmentWorkspace(
        employees=[_employee_view(employee) for employee in employees],
        plans=[_plan_view(row, names) for row in plans],
        assignments=[_assignment_view(row, names) for row in assignments],
    )


@router.post("/development/plans", response_model=DevelopmentPlanView, status_code=status.HTTP_201_CREATED)
def create_development_plan(
    payload: DevelopmentPlanCreate,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER")),
    db: Session = Depends(get_db),
):
    employee = _employee_for_tenant(db, principal.tenant_id, payload.employee_id)
    if not _can_manage(principal, employee):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee is outside your development scope")
    row = DevelopmentPlanModel(
        tenant_id=principal.tenant_id,
        employee_id=employee.id,
        competency=payload.competency,
        goal=payload.goal.strip(),
        action=payload.action.strip(),
        action_type=payload.action_type,
        success_metric=payload.success_metric.strip(),
        due_date=payload.due_date,
        status="Planlandı",
        created_by_user_id=principal.user_id,
        created_by_name=_actor_name(principal, db),
        intervention_id=payload.intervention_id,
        reassess_days=payload.reassess_days,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _plan_view(row, {employee.id: employee.full_name})


@router.patch("/development/plans/{plan_id}", response_model=DevelopmentPlanView)
def patch_development_plan(
    plan_id: str,
    payload: DevelopmentPlanPatch,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER")),
    db: Session = Depends(get_db),
):
    row = db.scalar(
        select(DevelopmentPlanModel).where(
            DevelopmentPlanModel.id == plan_id,
            DevelopmentPlanModel.tenant_id == principal.tenant_id,
        )
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Development plan not found")
    employee = _employee_for_tenant(db, principal.tenant_id, row.employee_id)
    if not _can_manage(principal, employee):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Development plan is outside your scope")
    row.status = payload.status
    db.commit()
    db.refresh(row)
    return _plan_view(row, {employee.id: employee.full_name})


@router.post("/development/plans/{plan_id}/transfer", response_model=DevelopmentAssignmentView, status_code=status.HTTP_201_CREATED)
def transfer_development_plan(
    plan_id: str,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER")),
    db: Session = Depends(get_db),
):
    plan = db.scalar(
        select(DevelopmentPlanModel).where(
            DevelopmentPlanModel.id == plan_id,
            DevelopmentPlanModel.tenant_id == principal.tenant_id,
        )
    )
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Development plan not found")
    employee = _employee_for_tenant(db, principal.tenant_id, plan.employee_id)
    if not _can_manage(principal, employee):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Development plan is outside your scope")
    existing = db.scalar(
        select(DevelopmentTrainingAssignmentModel).where(
            DevelopmentTrainingAssignmentModel.tenant_id == principal.tenant_id,
            DevelopmentTrainingAssignmentModel.source_development_plan_id == plan.id,
        )
    )
    if existing:
        return _assignment_view(existing, {employee.id: employee.full_name})
    training_name = plan.action.split(". İşe transfer görevi:", 1)[0].strip() or plan.goal
    assignment = DevelopmentTrainingAssignmentModel(
        tenant_id=principal.tenant_id,
        employee_id=employee.id,
        source_development_plan_id=plan.id,
        training_id=plan.intervention_id or f"dev-{plan.id}",
        training_name=training_name,
        assigned_by_user_id=principal.user_id,
        assigned_by_name=_actor_name(principal, db),
        assigned_at=datetime.now(timezone.utc),
        due_date=plan.due_date,
        status="Atandı",
        competency_code=plan.competency,
        transfer_task=plan.action,
        success_metric=plan.success_metric,
    )
    plan.transferred_to_training = True
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return _assignment_view(assignment, {employee.id: employee.full_name})


def _fixed_holidays(year: int) -> dict[date, float]:
    holidays: dict[date, float] = {
        date(year, 1, 1): 1,
        date(year, 4, 23): 1,
        date(year, 5, 1): 1,
        date(year, 5, 19): 1,
        date(year, 7, 15): 1,
        date(year, 8, 30): 1,
        date(year, 10, 28): .5,
        date(year, 10, 29): 1,
    }
    if year == 2026:
        holidays.update({
            date(2026, 3, 19): .5, date(2026, 3, 20): 1, date(2026, 3, 21): 1, date(2026, 3, 22): 1,
            date(2026, 5, 26): .5, date(2026, 5, 27): 1, date(2026, 5, 28): 1, date(2026, 5, 29): 1, date(2026, 5, 30): 1,
        })
    return holidays


def _leave_days(start: date, end: date, leave_type: str) -> float:
    if end < start:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid leave date range")
    cursor = start
    chargeable = 0.0
    holidays: dict[date, float] = {}
    for year in range(start.year, end.year + 1):
        holidays.update(_fixed_holidays(year))
    while cursor <= end:
        if leave_type == "sick":
            chargeable += 1
        elif cursor.weekday() < 5:
            fraction = holidays.get(cursor, 0)
            if fraction == .5:
                chargeable += .5
            elif fraction != 1:
                chargeable += 1
        cursor += timedelta(days=1)
    return round(chargeable * 2) / 2


def _leave_request_view(row: LeaveRequestModel, names: dict[str, str], departments: dict[str, str | None]) -> LeaveRequestView:
    return LeaveRequestView(
        id=row.id,
        employee_id=row.employee_id,
        employee_name=names.get(row.employee_id, ""),
        department=departments.get(row.employee_id),
        leave_type=row.leave_type,
        start_date=row.start_date,
        end_date=row.end_date,
        days=row.days,
        status=row.status,
        note=row.note,
        created_at=row.created_at,
        approved_by=row.approved_by_name,
    )


def _reward_view(row: RewardLeaveGrantModel, names: dict[str, str]) -> RewardGrantView:
    return RewardGrantView(
        id=row.id,
        employee_id=row.employee_id,
        employee_name=names.get(row.employee_id, ""),
        days=row.days,
        reason=row.reason,
        granted_by=row.granted_by_name,
        created_at=row.created_at,
    )


def _leave_balance(db: Session, tenant_id: str, employee: EmployeeModel, leave_type: str) -> float:
    approved = db.scalars(
        select(LeaveRequestModel).where(
            LeaveRequestModel.tenant_id == tenant_id,
            LeaveRequestModel.employee_id == employee.id,
            LeaveRequestModel.status == "Onaylandı",
        )
    ).all()
    if leave_type == "annual":
        used = sum(row.days for row in approved if row.leave_type == "annual")
        return max(0.0, float(employee.annual_leave_entitlement or 14) - used)
    if leave_type == "reward":
        granted = sum(db.scalars(
            select(RewardLeaveGrantModel.days).where(
                RewardLeaveGrantModel.tenant_id == tenant_id,
                RewardLeaveGrantModel.employee_id == employee.id,
            )
        ).all())
        used = sum(row.days for row in approved if row.leave_type == "reward")
        return max(0.0, float(granted) - used)
    return float("inf")


@router.get("/leave/workspace", response_model=LeaveWorkspace)
def leave_workspace(
    principal: Principal = Depends(require_roles(*ALL_ROLES)),
    db: Session = Depends(get_db),
):
    manageable = _scoped_employees(principal, db)
    current = _employee_for_tenant(db, principal.tenant_id, principal.employee_id) if principal.employee_id else None
    visible: dict[str, EmployeeModel] = {employee.id: employee for employee in manageable}
    if current:
        visible[current.id] = current
    ids = list(visible)
    if not ids:
        return LeaveWorkspace(current_employee=None, manageable_employees=[], requests=[], rewards=[])
    requests = db.scalars(
        select(LeaveRequestModel)
        .where(LeaveRequestModel.tenant_id == principal.tenant_id, LeaveRequestModel.employee_id.in_(ids))
        .order_by(LeaveRequestModel.created_at.desc())
    ).all()
    rewards = db.scalars(
        select(RewardLeaveGrantModel)
        .where(RewardLeaveGrantModel.tenant_id == principal.tenant_id, RewardLeaveGrantModel.employee_id.in_(ids))
        .order_by(RewardLeaveGrantModel.created_at.desc())
    ).all()
    names = {employee.id: employee.full_name for employee in visible.values()}
    departments = {employee.id: employee.department for employee in visible.values()}
    return LeaveWorkspace(
        current_employee=_employee_view(current) if current else None,
        manageable_employees=[_employee_view(employee) for employee in manageable if not current or employee.id != current.id],
        requests=[_leave_request_view(row, names, departments) for row in requests],
        rewards=[_reward_view(row, names) for row in rewards],
    )


@router.post("/leave/requests", response_model=LeaveRequestView, status_code=status.HTTP_201_CREATED)
def create_leave_request(
    payload: LeaveRequestCreate,
    principal: Principal = Depends(require_roles(*ALL_ROLES)),
    db: Session = Depends(get_db),
):
    if not principal.employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not linked to an employee")
    leave_type = payload.leave_type.lower()
    if leave_type not in LEAVE_TYPES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported leave type")
    employee = _employee_for_tenant(db, principal.tenant_id, principal.employee_id)
    days = _leave_days(payload.start_date, payload.end_date, leave_type)
    if days <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Leave request must contain at least half a chargeable day")
    balance = _leave_balance(db, principal.tenant_id, employee, leave_type)
    if days > balance:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Insufficient {leave_type} leave balance")
    row = LeaveRequestModel(
        tenant_id=principal.tenant_id,
        employee_id=employee.id,
        leave_type=leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        days=days,
        status="Bekliyor",
        note=payload.note.strip() if payload.note else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _leave_request_view(row, {employee.id: employee.full_name}, {employee.id: employee.department})


@router.patch("/leave/requests/{request_id}", response_model=LeaveRequestView)
def decide_leave_request(
    request_id: str,
    payload: LeaveDecision,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER")),
    db: Session = Depends(get_db),
):
    row = db.scalar(
        select(LeaveRequestModel).where(
            LeaveRequestModel.id == request_id,
            LeaveRequestModel.tenant_id == principal.tenant_id,
        )
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")
    employee = _employee_for_tenant(db, principal.tenant_id, row.employee_id)
    if not _can_manage(principal, employee):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Leave request is outside your approval scope")
    if row.status != "Bekliyor":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Leave request has already been decided")
    if payload.decision == "Onaylandı" and row.leave_type in {"annual", "reward"}:
        balance = _leave_balance(db, principal.tenant_id, employee, row.leave_type)
        if row.days > balance:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Leave balance changed and is no longer sufficient")
    row.status = payload.decision
    row.approved_by_user_id = principal.user_id
    row.approved_by_name = _actor_name(principal, db)
    db.commit()
    db.refresh(row)
    return _leave_request_view(row, {employee.id: employee.full_name}, {employee.id: employee.department})


@router.post("/leave/rewards", response_model=RewardGrantView, status_code=status.HTTP_201_CREATED)
def grant_reward_leave(
    payload: RewardGrantCreate,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER")),
    db: Session = Depends(get_db),
):
    employee = _employee_for_tenant(db, principal.tenant_id, payload.employee_id)
    if not _can_manage(principal, employee):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee is outside your reward scope")
    row = RewardLeaveGrantModel(
        tenant_id=principal.tenant_id,
        employee_id=employee.id,
        days=round(payload.days * 2) / 2,
        reason=payload.reason.strip(),
        granted_by_user_id=principal.user_id,
        granted_by_name=_actor_name(principal, db),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _reward_view(row, {employee.id: employee.full_name})


def _benchmark_view(row: CompensationBenchmarkModel) -> BenchmarkView:
    return BenchmarkView(
        id=row.id,
        department=row.department,
        position=row.position,
        market_average=row.market_average,
        source=row.source,
        updated_at=row.updated_at,
    )


def _cycle_view(row: CompensationCycleModel) -> CompensationCycleView:
    return CompensationCycleView(
        id=row.id,
        name=row.name,
        stage=row.stage,
        created_at=row.created_at,
        effective_date=row.effective_date,
        manager_deadline=row.manager_deadline,
        budget_limit=row.budget_limit,
        scenario=row.scenario,
        inflation_rate=row.inflation_rate,
        results=row.results_json or [],
        manager_requests=row.manager_requests_json or [],
        approved_by=row.approved_by,
        finalized_at=row.finalized_at,
        applied_at=row.applied_at,
        stage_history=row.stage_history_json or [],
    )


def _comp_cycle_for_tenant(db: Session, tenant_id: str, cycle_id: str) -> CompensationCycleModel:
    row = db.scalar(
        select(CompensationCycleModel).where(
            CompensationCycleModel.id == cycle_id,
            CompensationCycleModel.tenant_id == tenant_id,
        )
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compensation cycle not found")
    return row


def _comp_scope(principal: Principal, db: Session) -> list[EmployeeModel]:
    role = principal.role.upper()
    if role in EXECUTIVE_HR_ROLES:
        return _scoped_employees(principal, db)
    if role in LINE_MANAGER_ROLES:
        return _scoped_employees(principal, db)
    return []


@router.get("/compensation/workspace", response_model=CompensationWorkspace)
def compensation_workspace(
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER")),
    db: Session = Depends(get_db),
):
    employees = _comp_scope(principal, db)
    ids = [employee.id for employee in employees]
    names = {employee.id: employee.full_name for employee in employees}
    evaluations: list[CompensationEvaluationView] = []
    if ids:
        rows = db.scalars(
            select(PerformanceEvaluationModel)
            .where(PerformanceEvaluationModel.tenant_id == principal.tenant_id, PerformanceEvaluationModel.employee_id.in_(ids))
            .order_by(PerformanceEvaluationModel.evaluated_at.desc())
            .limit(2000)
        ).all()
        evaluations = [
            CompensationEvaluationView(
                employee_id=row.employee_id,
                employee_name=names.get(row.employee_id, ""),
                date=row.evaluated_at,
                performance=row.final_score,
                competency_score=row.competency_score,
                manager_scores=row.manager_scores_json or {},
                is_star_performer=row.is_star_performer,
            )
            for row in rows if row.employee_id in names
        ]
    benchmarks = db.scalars(
        select(CompensationBenchmarkModel)
        .where(CompensationBenchmarkModel.tenant_id == principal.tenant_id)
        .order_by(CompensationBenchmarkModel.department, CompensationBenchmarkModel.position)
    ).all()
    cycles = db.scalars(
        select(CompensationCycleModel)
        .where(CompensationCycleModel.tenant_id == principal.tenant_id)
        .order_by(CompensationCycleModel.created_at.desc())
    ).all()
    return CompensationWorkspace(
        employees=[_employee_view(employee) for employee in employees],
        evaluations=evaluations,
        benchmarks=[_benchmark_view(row) for row in benchmarks],
        cycles=[_cycle_view(row) for row in cycles],
    )


@router.post("/compensation/benchmarks", response_model=BenchmarkView)
def upsert_compensation_benchmark(
    payload: BenchmarkUpsert,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN")),
    db: Session = Depends(get_db),
):
    row = db.scalar(
        select(CompensationBenchmarkModel).where(
            CompensationBenchmarkModel.tenant_id == principal.tenant_id,
            CompensationBenchmarkModel.department == payload.department,
            CompensationBenchmarkModel.position == payload.position,
        )
    )
    if not row:
        row = CompensationBenchmarkModel(
            tenant_id=principal.tenant_id,
            department=payload.department,
            position=payload.position,
            market_average=payload.market_average,
            source=payload.source,
            updated_by_user_id=principal.user_id,
        )
        db.add(row)
    else:
        row.market_average = payload.market_average
        row.source = payload.source
        row.updated_by_user_id = principal.user_id
    db.commit()
    db.refresh(row)
    return _benchmark_view(row)


@router.post("/compensation/cycles", response_model=CompensationCycleView, status_code=status.HTTP_201_CREATED)
def create_compensation_cycle(
    payload: CycleCreate,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN")),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    deadline = now.date() + timedelta(days=21)
    next_month = (now.date().replace(day=28) + timedelta(days=4)).replace(day=1)
    row = CompensationCycleModel(
        tenant_id=principal.tenant_id,
        name=payload.name.strip(),
        stage="DRAFT_SIMULATION",
        budget_limit=payload.budget_limit,
        manager_deadline=deadline,
        effective_date=next_month,
        stage_history_json=[{"stage": "DRAFT_SIMULATION", "at": now.isoformat(), "by": _actor_name(principal, db)}],
        created_by_user_id=principal.user_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _cycle_view(row)


@router.patch("/compensation/cycles/{cycle_id}/simulation", response_model=CompensationCycleView)
def save_compensation_simulation(
    cycle_id: str,
    payload: CycleSimulationUpdate,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN")),
    db: Session = Depends(get_db),
):
    row = _comp_cycle_for_tenant(db, principal.tenant_id, cycle_id)
    if row.stage != "DRAFT_SIMULATION":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Simulation can only be edited in DRAFT_SIMULATION stage")
    tenant_employee_ids = set(db.scalars(select(EmployeeModel.id).where(EmployeeModel.tenant_id == principal.tenant_id)).all())
    sanitized: list[dict[str, Any]] = []
    for result in payload.results:
        employee_id = str(result.get("employee_id") or "")
        if not employee_id or employee_id not in tenant_employee_ids:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Each compensation result must reference an employee in the same company")
        next_salary = result.get("new_salary", result.get("Yeni Maaş"))
        try:
            salary = float(next_salary)
        except (TypeError, ValueError):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid new salary")
        if not isfinite(salary) or salary < 0:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid new salary")
        sanitized.append({**result, "employee_id": employee_id, "new_salary": salary})
    row.scenario = payload.scenario
    row.inflation_rate = payload.inflation_rate
    row.results_json = sanitized
    db.commit()
    db.refresh(row)
    return _cycle_view(row)


@router.post("/compensation/cycles/{cycle_id}/advance", response_model=CompensationCycleView)
def advance_compensation_cycle(
    cycle_id: str,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN")),
    db: Session = Depends(get_db),
):
    row = _comp_cycle_for_tenant(db, principal.tenant_id, cycle_id)
    if row.stage not in COMP_STAGES or row.stage in {"FINALIZED", "EFFECTIVE"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Compensation cycle cannot advance from its current stage")
    if row.stage == "APPROVAL" and principal.role.upper() != "CEO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CEO approval is required to finalize compensation")
    next_stage = COMP_STAGES[COMP_STAGES.index(row.stage) + 1]
    row.stage = next_stage
    now = datetime.now(timezone.utc)
    history = list(row.stage_history_json or [])
    history.append({"stage": next_stage, "at": now.isoformat(), "by": _actor_name(principal, db)})
    row.stage_history_json = history
    if next_stage == "FINALIZED":
        row.finalized_at = now
        row.approved_by = _actor_name(principal, db)
    db.commit()
    db.refresh(row)
    return _cycle_view(row)


@router.put("/compensation/cycles/{cycle_id}/manager-requests", response_model=CompensationCycleView)
def submit_manager_requests(
    cycle_id: str,
    payload: ManagerRequestsPayload,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER")),
    db: Session = Depends(get_db),
):
    row = _comp_cycle_for_tenant(db, principal.tenant_id, cycle_id)
    if row.stage != "MANAGER_INPUT":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Manager input is closed")
    scope = {employee.id: employee for employee in _comp_scope(principal, db)}
    if not scope:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No compensation scope is assigned")
    total_salary = sum(float(employee.salary_amount or 0) for employee in scope.values())
    requested_increase = 0.0
    manager_name = _actor_name(principal, db)
    submitted_at = datetime.now(timezone.utc).isoformat()
    new_rows: list[dict[str, Any]] = []
    for request in payload.requests:
        employee = scope.get(request.employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee is outside your compensation scope")
        current_salary = float(employee.salary_amount or 0)
        requested_increase += current_salary * request.rate / 100
        new_rows.append({
            "employee_id": employee.id,
            "employee": employee.full_name,
            "manager_user_id": principal.user_id,
            "manager": manager_name,
            "rate": request.rate,
            "note": request.note.strip(),
            "currentSalary": current_salary,
            "systemBaseline": request.system_baseline,
            "submittedAt": submitted_at,
        })
    budget_rate = requested_increase / total_salary * 100 if total_salary > 0 else 0
    if budget_rate > float(row.budget_limit or 30) + .0001:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Manager requests exceed the configured budget limit")
    retained = [item for item in (row.manager_requests_json or []) if item.get("manager_user_id") != principal.user_id]
    row.manager_requests_json = [*retained, *new_rows]
    db.commit()
    db.refresh(row)
    return _cycle_view(row)


@router.post("/compensation/cycles/{cycle_id}/apply", response_model=CompensationCycleView)
def apply_compensation_cycle(
    cycle_id: str,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN")),
    db: Session = Depends(get_db),
):
    row = _comp_cycle_for_tenant(db, principal.tenant_id, cycle_id)
    if row.stage != "FINALIZED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only a FINALIZED compensation cycle can be applied")
    results = list(row.results_json or [])
    if not results:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Finalized compensation cycle has no saved results")
    employee_ids = [str(item.get("employee_id") or "") for item in results]
    employees = {
        employee.id: employee
        for employee in db.scalars(
            select(EmployeeModel).where(
                EmployeeModel.tenant_id == principal.tenant_id,
                EmployeeModel.id.in_(employee_ids),
                EmployeeModel.active.is_(True),
            )
        ).all()
    }
    if len(employees) != len(set(employee_ids)):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Compensation results contain an invalid employee")
    for item in results:
        employee = employees[str(item["employee_id"])]
        salary = float(item.get("new_salary", item.get("Yeni Maaş", -1)))
        if not isfinite(salary) or salary < 0:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Compensation results contain an invalid salary")
        employee.salary_amount = salary
    now = datetime.now(timezone.utc)
    row.stage = "EFFECTIVE"
    row.applied_at = now
    row.effective_date = row.effective_date or now.date()
    history = list(row.stage_history_json or [])
    history.append({"stage": "EFFECTIVE", "at": now.isoformat(), "by": _actor_name(principal, db)})
    row.stage_history_json = history
    db.commit()
    db.refresh(row)
    return _cycle_view(row)
