"""Role-scoped, server-calculated dashboard summary for FutureHR SaaS."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from core.auth import Principal, require_roles
from core.database import get_db
from db.models import (
    DevelopmentPlanModel,
    DevelopmentTrainingAssignmentModel,
    EmployeeModel,
    LeaveRequestModel,
    PerformanceEvaluationModel,
)

router = APIRouter(prefix="/api/v1/dashboard", tags=["SaaS Dashboard"])
ALL_ROLES = ("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER", "PERSONEL", "EMPLOYEE")
EXECUTIVE_HR = {"CEO", "IK", "HR_ADMIN"}


def _scope(principal: Principal, db: Session) -> tuple[str, list[EmployeeModel]]:
    base = select(EmployeeModel).where(EmployeeModel.tenant_id == principal.tenant_id, EmployeeModel.active.is_(True))
    role = principal.role.upper()
    if role in EXECUTIVE_HR:
        return "COMPANY", list(db.scalars(base.order_by(EmployeeModel.full_name)).all())
    if not principal.employee_id:
        return "NONE", []
    if role == "DIRECTOR":
        me = db.scalar(base.where(EmployeeModel.id == principal.employee_id))
        if not me or not me.department:
            return "SELF", [me] if me else []
        return "DEPARTMENT", list(db.scalars(base.where(EmployeeModel.department == me.department).order_by(EmployeeModel.full_name)).all())
    if role == "MANAGER":
        rows = list(db.scalars(base.where(or_(EmployeeModel.manager_employee_id == principal.employee_id, EmployeeModel.second_manager_employee_id == principal.employee_id)).order_by(EmployeeModel.full_name)).all())
        return "DIRECT_REPORTS", rows
    me = db.scalar(base.where(EmployeeModel.id == principal.employee_id))
    return "SELF", [me] if me else []


def _task(key: str, title: str, description: str, href: str, count: int) -> dict:
    return {"key": key, "title": title, "description": description, "href": href, "count": count}


@router.get("/summary")
def dashboard_summary(
    principal: Principal = Depends(require_roles(*ALL_ROLES)),
    db: Session = Depends(get_db),
):
    scope, employees = _scope(principal, db)
    employee_ids = [employee.id for employee in employees]
    role = principal.role.upper()
    now = datetime.now(timezone.utc)
    today = date.today()

    profile = None
    if principal.employee_id:
        me = db.scalar(select(EmployeeModel).where(EmployeeModel.id == principal.employee_id, EmployeeModel.tenant_id == principal.tenant_id))
        if me:
            profile = {"employee_id": me.id, "name": me.full_name, "department": me.department, "position": me.position}

    pending_leave = overdue_development = incomplete_training = missing_performance = 0
    if employee_ids:
        pending_leave = len(db.scalars(select(LeaveRequestModel.id).where(
            LeaveRequestModel.tenant_id == principal.tenant_id,
            LeaveRequestModel.employee_id.in_(employee_ids),
            LeaveRequestModel.status == "Bekliyor",
        )).all())
        overdue_development = len(db.scalars(select(DevelopmentPlanModel.id).where(
            DevelopmentPlanModel.tenant_id == principal.tenant_id,
            DevelopmentPlanModel.employee_id.in_(employee_ids),
            DevelopmentPlanModel.due_date.is_not(None),
            DevelopmentPlanModel.due_date < today,
            DevelopmentPlanModel.status != "Tamamlandı",
        )).all())
        incomplete_training = len(db.scalars(select(DevelopmentTrainingAssignmentModel.id).where(
            DevelopmentTrainingAssignmentModel.tenant_id == principal.tenant_id,
            DevelopmentTrainingAssignmentModel.employee_id.in_(employee_ids),
            DevelopmentTrainingAssignmentModel.status.notin_(["Tamamlandı", "completed", "verified"]),
        )).all())
        recent_eval_ids = set(db.scalars(select(PerformanceEvaluationModel.employee_id).where(
            PerformanceEvaluationModel.tenant_id == principal.tenant_id,
            PerformanceEvaluationModel.employee_id.in_(employee_ids),
            PerformanceEvaluationModel.evaluated_at >= now - timedelta(days=365),
        )).all())
        missing_performance = len([employee_id for employee_id in employee_ids if employee_id not in recent_eval_ids])

    counts = {
        "pending_leave": pending_leave,
        "missing_performance": missing_performance,
        "overdue_development": overdue_development,
        "incomplete_training": incomplete_training,
    }
    tasks = [
        _task("leave", "İzin taleplerini incele", "Bekleyen izinleri tek ekrandan değerlendirin.", "/izinler", pending_leave),
        _task("performance", "Performans değerlendirmelerini tamamla", "Son 12 ayda değerlendirmesi bulunmayan kayıtları gözden geçirin.", "/degerlendirme", missing_performance),
        _task("development", "Geciken gelişim planlarını gözden geçir", "Son tarihi geçen açık gelişim aksiyonlarını yönetin.", "/gelisim", overdue_development),
        _task("training", "Eğitim takibini tamamla", "Açık eğitim atamalarını ve işe transfer durumunu kontrol edin.", "/egitim", incomplete_training),
    ]
    tasks = sorted(tasks, key=lambda item: item["count"], reverse=True)

    if role in EXECUTIVE_HR:
        quick_actions = [
            {"title": "Çalışan ekle", "href": "/organizasyon"},
            {"title": "Performans", "href": "/degerlendirme"},
            {"title": "Karar Desteği", "href": "/karar-merkezi"},
            {"title": "Ücret Yönetimi", "href": "/maas"},
        ]
    elif role in {"DIRECTOR", "MANAGER"}:
        quick_actions = [
            {"title": "Ekibim", "href": "/ekip-yonetimi"},
            {"title": "Performans", "href": "/degerlendirme"},
            {"title": "İzinler", "href": "/izinler"},
            {"title": "Gelişim", "href": "/gelisim"},
        ]
    else:
        quick_actions = [
            {"title": "Benim Alanım", "href": "/kullanici"},
            {"title": "İzinler", "href": "/izinler"},
            {"title": "Kariyer", "href": "/kariyer"},
            {"title": "Eğitimler", "href": "/egitim"},
        ]

    return {
        "success": True,
        "source": "server",
        "tenant_scoped": True,
        "generated_at": now.isoformat(),
        "scope": scope,
        "role": role,
        "tenant": {"id": principal.tenant_id, "name": principal.tenant_name},
        "profile": profile,
        "employee_count": len(employees),
        "attention_count": sum(counts.values()),
        "counts": counts,
        "tasks": tasks,
        "quick_actions": quick_actions,
    }
