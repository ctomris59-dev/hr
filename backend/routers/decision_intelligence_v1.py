"""FutureHR Decision Intelligence v2.

This router composes existing tenant-scoped HR facts into explainable decision
profiles. It deliberately avoids duplicating performance, talent, development,
leave and compensation source data. Human review is persisted in the employee's
tenant-scoped metadata and all endpoints remain advisory: the API never executes
a promotion, dismissal or compensation decision on behalf of a user.
"""
from __future__ import annotations

from datetime import datetime, timezone
from statistics import median
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from core.auth import Principal, require_roles
from core.config import get_settings
from core.database import get_db
from db.models import (
    CompensationBenchmarkModel,
    DevelopmentPlanModel,
    EmployeeModel,
    LeaveRequestModel,
    PerformanceEvaluationModel,
    TalentProfileModel,
    TenantModel,
)

router = APIRouter(prefix="/api/v1", tags=["Decision Intelligence v2"])
settings = get_settings()
ALL_ROLES = ("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER", "PERSONEL", "EMPLOYEE")
MANAGEMENT_ROLES = {"CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER"}
EXECUTIVE_HR_ROLES = {"CEO", "IK", "HR_ADMIN"}
LINE_MANAGER_ROLES = {"DIRECTOR", "MANAGER"}


class HumanReviewInput(BaseModel):
    decision_type: str = Field(default="general", min_length=2, max_length=80)
    status: Literal["ACKNOWLEDGED", "NEEDS_EVIDENCE", "APPROVED_FOR_NEXT_STEP", "REJECTED"]
    note: str | None = Field(default=None, max_length=3000)


class CandidateConversionInput(BaseModel):
    candidate_source_id: str = Field(min_length=1, max_length=120)
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr | None = None
    department: str | None = Field(default=None, max_length=160)
    position: str | None = Field(default=None, max_length=200)
    job_family: str | None = Field(default=None, max_length=160)
    job_level: str | None = Field(default=None, max_length=24)
    assessment_summary: str | None = Field(default=None, max_length=4000)
    competency_signals: dict[str, float] = Field(default_factory=dict)


class ConnectorUpdate(BaseModel):
    enabled: bool
    mode: Literal["file", "api", "manual"] = "manual"
    label: str | None = Field(default=None, max_length=120)


def _employee_for_tenant(db: Session, tenant_id: str, employee_id: str) -> EmployeeModel:
    row = db.scalar(
        select(EmployeeModel).where(
            EmployeeModel.id == employee_id,
            EmployeeModel.tenant_id == tenant_id,
            EmployeeModel.active.is_(True),
        )
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return row


def _can_view(principal: Principal, employee: EmployeeModel) -> bool:
    role = principal.role.upper()
    if role in EXECUTIVE_HR_ROLES:
        return True
    if principal.employee_id == employee.id:
        return True
    if role in LINE_MANAGER_ROLES and principal.employee_id:
        return employee.manager_employee_id == principal.employee_id or employee.second_manager_employee_id == principal.employee_id
    return False


def _require_view(principal: Principal, employee: EmployeeModel) -> None:
    if not _can_view(principal, employee):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee is outside your decision scope")


def _scoped_employees(principal: Principal, db: Session) -> list[EmployeeModel]:
    query = select(EmployeeModel).where(EmployeeModel.tenant_id == principal.tenant_id, EmployeeModel.active.is_(True))
    role = principal.role.upper()
    if role in EXECUTIVE_HR_ROLES:
        pass
    elif role in LINE_MANAGER_ROLES and principal.employee_id:
        query = query.where(
            or_(
                EmployeeModel.id == principal.employee_id,
                EmployeeModel.manager_employee_id == principal.employee_id,
                EmployeeModel.second_manager_employee_id == principal.employee_id,
            )
        )
    elif principal.employee_id:
        query = query.where(EmployeeModel.id == principal.employee_id)
    else:
        return []
    return list(db.scalars(query.order_by(EmployeeModel.full_name)).all())


def _latest_evaluation(db: Session, tenant_id: str, employee_id: str) -> PerformanceEvaluationModel | None:
    return db.scalar(
        select(PerformanceEvaluationModel)
        .where(
            PerformanceEvaluationModel.tenant_id == tenant_id,
            PerformanceEvaluationModel.employee_id == employee_id,
        )
        .order_by(PerformanceEvaluationModel.evaluated_at.desc())
        .limit(1)
    )


def _talent_profile(db: Session, tenant_id: str, employee_id: str) -> TalentProfileModel | None:
    return db.scalar(
        select(TalentProfileModel).where(
            TalentProfileModel.tenant_id == tenant_id,
            TalentProfileModel.employee_id == employee_id,
        )
    )


def _active_development(db: Session, tenant_id: str, employee_id: str) -> list[DevelopmentPlanModel]:
    return list(
        db.scalars(
            select(DevelopmentPlanModel)
            .where(
                DevelopmentPlanModel.tenant_id == tenant_id,
                DevelopmentPlanModel.employee_id == employee_id,
                DevelopmentPlanModel.status != "Tamamlandı",
            )
            .order_by(DevelopmentPlanModel.created_at.desc())
        ).all()
    )


def _leave_summary(db: Session, tenant_id: str, employee_id: str) -> dict[str, Any]:
    rows = list(
        db.scalars(
            select(LeaveRequestModel).where(
                LeaveRequestModel.tenant_id == tenant_id,
                LeaveRequestModel.employee_id == employee_id,
            )
        ).all()
    )
    return {
        "pending": sum(1 for row in rows if row.status == "Bekliyor"),
        "approved_days": round(sum(float(row.days or 0) for row in rows if row.status == "Onaylandı"), 1),
    }


def _benchmark(db: Session, employee: EmployeeModel) -> CompensationBenchmarkModel | None:
    if not employee.department or not employee.position:
        return None
    return db.scalar(
        select(CompensationBenchmarkModel).where(
            CompensationBenchmarkModel.tenant_id == employee.tenant_id,
            CompensationBenchmarkModel.department == employee.department,
            CompensationBenchmarkModel.position == employee.position,
        )
    )


def _round(value: float | None, digits: int = 1) -> float | None:
    if value is None:
        return None
    return round(float(value), digits)


def _competency_signals(evaluation: PerformanceEvaluationModel | None) -> dict[str, float]:
    if not evaluation:
        return {}
    raw = evaluation.manager_scores_json or {}
    result: dict[str, float] = {}
    for key, value in raw.items():
        try:
            score = float(value)
        except (TypeError, ValueError):
            continue
        if 0 < score <= 5:
            result[str(key)] = round(score, 2)
    return result


def _compensation_insight(db: Session, employee: EmployeeModel) -> dict[str, Any]:
    salary = float(employee.salary_amount) if employee.salary_amount else None
    benchmark = _benchmark(db, employee)
    market = float(benchmark.market_average) if benchmark else None
    peers = list(
        db.scalars(
            select(EmployeeModel).where(
                EmployeeModel.tenant_id == employee.tenant_id,
                EmployeeModel.active.is_(True),
                EmployeeModel.department == employee.department,
                EmployeeModel.position == employee.position,
                EmployeeModel.salary_amount.is_not(None),
            )
        ).all()
    )
    peer_salaries = [float(row.salary_amount) for row in peers if row.salary_amount]
    peer_median = median(peer_salaries) if peer_salaries else None
    reports = list(
        db.scalars(
            select(EmployeeModel).where(
                EmployeeModel.tenant_id == employee.tenant_id,
                EmployeeModel.active.is_(True),
                or_(
                    EmployeeModel.manager_employee_id == employee.id,
                    EmployeeModel.second_manager_employee_id == employee.id,
                ),
                EmployeeModel.salary_amount.is_not(None),
            )
        ).all()
    )
    highest_report = max((float(row.salary_amount) for row in reports if row.salary_amount), default=None)
    compa_ratio = salary / market if salary and market else None
    peer_ratio = salary / peer_median if salary and peer_median else None
    compression_ratio = highest_report / salary if salary and highest_report else None
    return {
        "salary_available": salary is not None,
        "market_benchmark_available": market is not None,
        "market_average": _round(market, 0),
        "compa_ratio": _round(compa_ratio, 3),
        "market_gap_pct": _round(((salary - market) / market) * 100, 1) if salary and market else None,
        "peer_median": _round(peer_median, 0),
        "peer_position_pct": _round((peer_ratio - 1) * 100, 1) if peer_ratio is not None else None,
        "compression_risk": bool(compression_ratio is not None and compression_ratio >= 0.90),
        "compression_ratio": _round(compression_ratio, 3),
        "benchmark_source": benchmark.source if benchmark else None,
    }


def _evidence_profile(
    evaluation: PerformanceEvaluationModel | None,
    talent: TalentProfileModel | None,
    development: list[DevelopmentPlanModel],
    compensation: dict[str, Any],
) -> dict[str, Any]:
    checks = [
        ("performance", evaluation is not None, 30, "Güncel performans değerlendirmesi"),
        ("competencies", bool(_competency_signals(evaluation)), 25, "Yönetici yetkinlik kanıtı"),
        ("career_signals", bool(talent and talent.career_aspiration is not None), 15, "Kariyer isteği"),
        ("mobility", bool(talent and talent.mobility_willingness is not None), 10, "Mobilite isteği"),
        ("development", bool(development), 10, "Aktif gelişim kanıtı"),
        ("compensation", bool(compensation.get("market_benchmark_available")), 10, "Dış ücret benchmarkı"),
    ]
    score = sum(weight for _, present, weight, _ in checks if present)
    missing = [label for _, present, _, label in checks if not present]
    band = "yüksek" if score >= 80 else "orta" if score >= 55 else "düşük"
    return {
        "score": score,
        "band": band,
        "signals": [{"key": key, "present": present, "weight": weight, "label": label} for key, present, weight, label in checks],
        "missing": missing,
    }


def _decision_recommendation(
    evaluation: PerformanceEvaluationModel | None,
    evidence: dict[str, Any],
    development: list[DevelopmentPlanModel],
    compensation: dict[str, Any],
) -> dict[str, Any]:
    performance = float(evaluation.final_score) if evaluation else None
    gaps: list[str] = list(evidence["missing"])
    risks: list[str] = []
    if compensation.get("compression_risk"):
        risks.append("Yönetici-ekip ücret sıkışması sinyali")
    if evidence["score"] < 55:
        title = "Önce kanıtı tamamla"
        next_step = "Eksik veri tamamlanmadan terfi, halefiyet veya ücret yönünde güçlü öneri üretme."
    elif performance is not None and performance >= 4.2:
        title = "Yüksek katkıyı kariyer ve ücret bağlamında incele"
        next_step = "Kariyer isteği, rol hazırlığı ve ücret konumunu insan değerlendirmesiyle birlikte gözden geçir."
    elif performance is not None and performance < 3.0:
        title = "Performans nedenini ve gelişim desteğini doğrula"
        next_step = "Tek puana dayanma; hedef, yönetici gözlemi ve gelişim planı kanıtlarını birlikte incele."
    elif development:
        title = "Gelişim ilerlemesini yeniden ölç"
        next_step = "Aktif gelişim aksiyonlarının hedef yetkinlikte ölçülebilir değişim üretip üretmediğini doğrula."
    else:
        title = "Karar profili izlemeye hazır"
        next_step = "Yeni performans ve yetkinlik kanıtları geldikçe karar profilini güncelle."
    return {
        "title": title,
        "next_step": next_step,
        "decision_authority": "human",
        "autonomous_action": False,
        "evidence_gaps": gaps,
        "risks": risks,
    }


def _reviews(employee: EmployeeModel) -> list[dict[str, Any]]:
    metadata = dict(employee.metadata_json or {})
    reviews = metadata.get("decision_reviews")
    return list(reviews) if isinstance(reviews, list) else []


def _digital_twin(db: Session, employee: EmployeeModel) -> dict[str, Any]:
    evaluation = _latest_evaluation(db, employee.tenant_id, employee.id)
    talent = _talent_profile(db, employee.tenant_id, employee.id)
    development = _active_development(db, employee.tenant_id, employee.id)
    leave = _leave_summary(db, employee.tenant_id, employee.id)
    compensation = _compensation_insight(db, employee)
    evidence = _evidence_profile(evaluation, talent, development, compensation)
    recommendation = _decision_recommendation(evaluation, evidence, development, compensation)
    skills = _competency_signals(evaluation)
    return {
        "employee": {
            "id": employee.id,
            "external_id": employee.external_id,
            "full_name": employee.full_name,
            "department": employee.department,
            "position": employee.position,
            "job_family": employee.job_family,
            "job_level": employee.job_level,
            "manager_employee_id": employee.manager_employee_id,
            "hire_date": employee.hire_date.isoformat() if employee.hire_date else None,
            "employment_type": employee.employment_type,
            "location": employee.location,
            "source": (employee.metadata_json or {}).get("lifecycle_source", "employee_master"),
        },
        "performance": {
            "score": _round(float(evaluation.final_score), 2) if evaluation else None,
            "kpi_score": _round(evaluation.kpi_score, 2) if evaluation else None,
            "manager_score": _round(evaluation.manager_performance_score, 2) if evaluation else None,
            "competency_score": _round(evaluation.competency_score, 2) if evaluation else None,
            "evaluated_at": evaluation.evaluated_at.isoformat() if evaluation else None,
        },
        "skills": skills,
        "talent": {
            "career_aspiration": _round(talent.career_aspiration, 1) if talent else None,
            "mobility_willingness": _round(talent.mobility_willingness, 1) if talent else None,
        },
        "development": {
            "active_count": len(development),
            "items": [
                {
                    "id": row.id,
                    "competency": row.competency,
                    "goal": row.goal,
                    "status": row.status,
                    "due_date": row.due_date.isoformat() if row.due_date else None,
                }
                for row in development[:6]
            ],
        },
        "leave": leave,
        "compensation": compensation,
        "evidence": evidence,
        "decision": recommendation,
        "human_reviews": _reviews(employee)[-10:],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def _skill_graph(principal: Principal, db: Session) -> dict[str, Any]:
    employees = _scoped_employees(principal, db)
    employee_nodes: list[dict[str, Any]] = []
    skill_nodes: dict[str, dict[str, Any]] = {}
    role_nodes: dict[str, dict[str, Any]] = {}
    edges: list[dict[str, Any]] = []
    role_skill_values: dict[str, dict[str, list[float]]] = {}

    for employee in employees:
        evaluation = _latest_evaluation(db, principal.tenant_id, employee.id)
        skills = _competency_signals(evaluation)
        employee_nodes.append({"id": employee.id, "name": employee.full_name, "department": employee.department, "position": employee.position})
        role = employee.position or "Tanımsız rol"
        role_id = f"role:{role}"
        role_nodes.setdefault(role_id, {"id": role_id, "label": role, "type": "role"})
        edges.append({"source": employee.id, "target": role_id, "type": "holds_role"})
        for code, score in skills.items():
            skill_id = f"skill:{code}"
            skill_nodes.setdefault(skill_id, {"id": skill_id, "label": code, "type": "skill"})
            edges.append({"source": employee.id, "target": skill_id, "type": "demonstrates", "score": score})
            role_skill_values.setdefault(role, {}).setdefault(code, []).append(score)

    role_requirements: list[dict[str, Any]] = []
    for role, skills in role_skill_values.items():
        for code, values in skills.items():
            if not values:
                continue
            baseline = sum(values) / len(values)
            target = min(5.0, max(3.5, baseline + 0.25))
            role_requirements.append({"role": role, "skill": code, "target": round(target, 2), "sample_size": len(values), "source": "tenant_evidence_baseline"})
            edges.append({"source": f"role:{role}", "target": f"skill:{code}", "type": "requires", "target_score": round(target, 2)})

    return {
        "nodes": [*role_nodes.values(), *skill_nodes.values(), *employee_nodes],
        "edges": edges,
        "role_requirements": role_requirements,
        "method": "Role skill targets are evidence-derived tenant baselines, not external norms.",
    }


@router.get("/decision/employees/{employee_id}")
def employee_decision_profile(
    employee_id: str,
    principal: Principal = Depends(require_roles(*ALL_ROLES)),
    db: Session = Depends(get_db),
):
    employee = _employee_for_tenant(db, principal.tenant_id, employee_id)
    _require_view(principal, employee)
    twin = _digital_twin(db, employee)
    return {
        "employee": twin["employee"],
        "recommendation": twin["decision"],
        "evidence": twin["evidence"],
        "explainability_chain": [
            {"step": "Öneri", "value": twin["decision"]["title"]},
            {"step": "Dayanak", "value": f"Kanıt skoru {twin['evidence']['score']}/100; performans {twin['performance']['score'] if twin['performance']['score'] is not None else 'yok'}"},
            {"step": "Kanıt Güveni", "value": twin["evidence"]["band"]},
            {"step": "Eksik Veri", "value": twin["evidence"]["missing"]},
            {"step": "Risk", "value": twin["decision"]["risks"]},
            {"step": "İnsan Onayı", "value": twin["human_reviews"][-1] if twin["human_reviews"] else None},
        ],
        "guardrail": "FutureHR karar desteği sunar; nihai istihdam, terfi, halefiyet ve ücret kararı yetkili insan kullanıcıdadır.",
    }


@router.post("/decision/employees/{employee_id}/review", status_code=status.HTTP_201_CREATED)
def record_human_review(
    employee_id: str,
    payload: HumanReviewInput,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER")),
    db: Session = Depends(get_db),
):
    employee = _employee_for_tenant(db, principal.tenant_id, employee_id)
    _require_view(principal, employee)
    metadata = dict(employee.metadata_json or {})
    reviews = list(metadata.get("decision_reviews") or [])
    review = {
        "id": f"review-{len(reviews) + 1}",
        "decision_type": payload.decision_type,
        "status": payload.status,
        "note": payload.note,
        "reviewed_by_user_id": principal.user_id,
        "reviewed_by": principal.username,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    }
    reviews.append(review)
    metadata["decision_reviews"] = reviews[-50:]
    employee.metadata_json = metadata
    db.commit()
    return review


@router.get("/decision/priorities")
def decision_priorities(
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER")),
    db: Session = Depends(get_db),
):
    rows = []
    for employee in _scoped_employees(principal, db):
        twin = _digital_twin(db, employee)
        score = twin["evidence"]["score"]
        performance = twin["performance"]["score"]
        priority = 0
        reasons: list[str] = []
        if score < 55:
            priority += 3
            reasons.append("Düşük kanıt güveni")
        if twin["compensation"]["compression_risk"]:
            priority += 2
            reasons.append("Ücret sıkışması")
        if twin["development"]["active_count"] and performance is not None:
            priority += 1
            reasons.append("Aktif gelişim / yeniden ölçüm")
        if performance is not None and performance >= 4.2:
            priority += 1
            reasons.append("Yüksek performans")
        if reasons:
            rows.append({
                "employee_id": employee.id,
                "employee_name": employee.full_name,
                "department": employee.department,
                "priority_score": priority,
                "reasons": reasons,
                "recommended_next_step": twin["decision"]["next_step"],
                "evidence_score": score,
            })
    rows.sort(key=lambda row: (-row["priority_score"], row["employee_name"]))
    return {"items": rows[:25], "generated_at": datetime.now(timezone.utc).isoformat()}


@router.get("/digital-twin/{employee_id}")
def employee_digital_twin(
    employee_id: str,
    principal: Principal = Depends(require_roles(*ALL_ROLES)),
    db: Session = Depends(get_db),
):
    employee = _employee_for_tenant(db, principal.tenant_id, employee_id)
    _require_view(principal, employee)
    return _digital_twin(db, employee)


@router.get("/skills/graph")
def skills_graph(
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER")),
    db: Session = Depends(get_db),
):
    return _skill_graph(principal, db)


@router.get("/compensation/insights/{employee_id}")
def compensation_insights(
    employee_id: str,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER")),
    db: Session = Depends(get_db),
):
    employee = _employee_for_tenant(db, principal.tenant_id, employee_id)
    _require_view(principal, employee)
    return {"employee_id": employee.id, "employee_name": employee.full_name, **_compensation_insight(db, employee)}


@router.post("/lifecycle/candidates/convert", status_code=status.HTTP_201_CREATED)
def convert_candidate_to_employee(
    payload: CandidateConversionInput,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN")),
    db: Session = Depends(get_db),
):
    employees = list(db.scalars(select(EmployeeModel).where(EmployeeModel.tenant_id == principal.tenant_id)).all())
    for row in employees:
        metadata = row.metadata_json or {}
        if metadata.get("candidate_source_id") == payload.candidate_source_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Candidate has already been converted to an employee")
        if payload.email and row.email and row.email.lower() == str(payload.email).lower() and row.active:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An active employee with this email already exists")
    invalid_skill = next((key for key, value in payload.competency_signals.items() if not 0 <= float(value) <= 5), None)
    if invalid_skill:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid competency score: {invalid_skill}")
    metadata = {
        "lifecycle_source": "recruitment",
        "candidate_source_id": payload.candidate_source_id,
        "candidate_converted_at": datetime.now(timezone.utc).isoformat(),
        "candidate_assessment_summary": payload.assessment_summary,
        "candidate_competency_signals": payload.competency_signals,
        "candidate_conversion_actor": principal.user_id,
    }
    employee = EmployeeModel(
        tenant_id=principal.tenant_id,
        full_name=payload.full_name.strip(),
        email=str(payload.email) if payload.email else None,
        department=payload.department,
        position=payload.position,
        job_family=payload.job_family,
        job_level=payload.job_level,
        active=True,
        metadata_json=metadata,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return {
        "employee_id": employee.id,
        "full_name": employee.full_name,
        "lifecycle_source": "recruitment",
        "candidate_source_id": payload.candidate_source_id,
        "next_step": "Onboarding ve ilk 90 gün hedefleri çalışan ana verisi üzerinden yönetilebilir.",
    }


@router.get("/lifecycle/employees/{employee_id}/origin")
def lifecycle_origin(
    employee_id: str,
    principal: Principal = Depends(require_roles(*ALL_ROLES)),
    db: Session = Depends(get_db),
):
    employee = _employee_for_tenant(db, principal.tenant_id, employee_id)
    _require_view(principal, employee)
    metadata = employee.metadata_json or {}
    return {
        "employee_id": employee.id,
        "source": metadata.get("lifecycle_source", "employee_master"),
        "candidate_source_id": metadata.get("candidate_source_id"),
        "converted_at": metadata.get("candidate_converted_at"),
        "assessment_summary": metadata.get("candidate_assessment_summary"),
        "competency_signals": metadata.get("candidate_competency_signals") or {},
    }


def _connector_state(tenant: TenantModel) -> dict[str, Any]:
    settings_json = dict(tenant.settings_json or {})
    connectors = settings_json.get("turkiye_connectors")
    stored = connectors if isinstance(connectors, dict) else {}
    return {
        provider: {
            "enabled": bool((stored.get(provider) or {}).get("enabled")),
            "mode": (stored.get(provider) or {}).get("mode", "manual"),
            "label": (stored.get(provider) or {}).get("label"),
        }
        for provider in ("sgk", "logo", "mikro", "netsis")
    }


@router.get("/compliance/turkiye/status")
def turkiye_compliance_status(
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN")),
    db: Session = Depends(get_db),
):
    tenant = db.scalar(select(TenantModel).where(TenantModel.id == principal.tenant_id))
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    connectors = _connector_state(tenant)
    checks = [
        {"key": "tenant_isolation", "label": "Şirket verisi tenant sınırında", "status": "ready"},
        {"key": "secure_auth", "label": "Sunucu tarafı güvenli oturum", "status": "ready" if settings.SAAS_AUTH_ENABLED else "attention"},
        {"key": "legacy_api", "label": "Legacy API production'da kapalı", "status": "ready" if not settings.ALLOW_LEGACY_API_IN_SAAS else "attention"},
        {"key": "ai_human_oversight", "label": "AI kararlarında insan onayı", "status": "ready"},
        {"key": "pulse_privacy", "label": "Bireysel pulse ham verisi kapalı", "status": "ready"},
        {"key": "connector_readiness", "label": "Türkiye bordro/SGK entegrasyon hazırlığı", "status": "ready" if any(v["enabled"] for v in connectors.values()) else "not_configured"},
    ]
    return {
        "country_code": tenant.country_code,
        "locale": tenant.locale,
        "checks": checks,
        "connectors": connectors,
        "notice": "Bu katman teknik uyum ve entegrasyon hazırlığını gösterir; hukuki görüş veya canlı SGK işlemi anlamına gelmez.",
    }


@router.patch("/compliance/turkiye/connectors/{provider}")
def update_turkiye_connector(
    provider: Literal["sgk", "logo", "mikro", "netsis"],
    payload: ConnectorUpdate,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN")),
    db: Session = Depends(get_db),
):
    tenant = db.scalar(select(TenantModel).where(TenantModel.id == principal.tenant_id))
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    settings_json = dict(tenant.settings_json or {})
    connectors = dict(settings_json.get("turkiye_connectors") or {})
    connectors[provider] = {
        "enabled": payload.enabled,
        "mode": payload.mode,
        "label": payload.label,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": principal.user_id,
    }
    settings_json["turkiye_connectors"] = connectors
    tenant.settings_json = settings_json
    db.commit()
    return {"provider": provider, **connectors[provider], "secrets_stored": False}
