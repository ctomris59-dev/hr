"""Server-backed bridge for remaining FutureHR product state.

The endpoint is intentionally small and whitelist-driven. It lets legacy client
modules leave localStorage in SaaS mode without exposing another tenant's or
another manager's employee records. Dedicated relational modules remain the
preferred target; this bridge is only the migration boundary.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from core.auth import Principal, get_current_principal, require_roles
from core.database import get_db
from db.models import EmployeeModel, new_id, utcnow
from db.product_state_models import TenantProductStateModel
from db.recruitment_models import RecruitmentCandidateModel

router = APIRouter(prefix="/api/v1/state", tags=["Product State SaaS"])
HR_ROLES = {"CEO", "IK", "HR_ADMIN"}
MANAGEMENT_ROLES = HR_ROLES | {"DIRECTOR", "MANAGER"}
EMPLOYEE_NAMESPACES = {"assessments", "training_assignments", "career_profiles", "decision_actions"}
COMPANY_NAMESPACES = {"role_overrides", "security_pack", "onboarding_state"}
ALLOWED_NAMESPACES = EMPLOYEE_NAMESPACES | COMPANY_NAMESPACES
MANAGEMENT_WRITE_NAMESPACES = {"training_assignments", "decision_actions"}
CANDIDATE_STAGES = {"Başvuru", "Ön Eleme", "Test", "Mülakat", "Teklif", "İşe Alındı", "Reddedildi"}


class StateReplaceInput(BaseModel):
    items: list[dict[str, Any]] = Field(default_factory=list, max_length=5000)


class CandidateSyncInput(BaseModel):
    items: list[dict[str, Any]] = Field(default_factory=list, max_length=5000)


def _employee_scope(principal: Principal, db: Session) -> set[str] | None:
    role = principal.role.upper()
    if role in HR_ROLES:
        return None
    if not principal.employee_id:
        return set()
    scope = {principal.employee_id}
    if role == "DIRECTOR":
        me = db.scalar(
            select(EmployeeModel).where(
                EmployeeModel.id == principal.employee_id,
                EmployeeModel.tenant_id == principal.tenant_id,
            )
        )
        if me and me.department:
            scope.update(
                db.scalars(
                    select(EmployeeModel.id).where(
                        EmployeeModel.tenant_id == principal.tenant_id,
                        EmployeeModel.department == me.department,
                        EmployeeModel.active.is_(True),
                    )
                ).all()
            )
        return scope
    if role == "MANAGER":
        scope.update(
            db.scalars(
                select(EmployeeModel.id).where(
                    EmployeeModel.tenant_id == principal.tenant_id,
                    EmployeeModel.active.is_(True),
                    or_(
                        EmployeeModel.manager_employee_id == principal.employee_id,
                        EmployeeModel.second_manager_employee_id == principal.employee_id,
                    ),
                )
            ).all()
        )
    return scope


def _employee_for_item(item: dict[str, Any], principal: Principal, db: Session) -> str | None:
    raw_id = (
        item.get("employee_id")
        or item.get("employeeId")
        or item.get("subject_employee_id")
        or item.get("subjectId")
    )
    if raw_id:
        found = db.scalar(
            select(EmployeeModel.id).where(
                EmployeeModel.id == str(raw_id),
                EmployeeModel.tenant_id == principal.tenant_id,
            )
        )
        if found:
            return str(found)
    raw_name = (
        item.get("employee")
        or item.get("Personel")
        or item.get("subjectName")
        or item.get("employeeName")
    )
    if raw_name:
        found = db.scalar(
            select(EmployeeModel.id).where(
                EmployeeModel.tenant_id == principal.tenant_id,
                EmployeeModel.full_name == str(raw_name),
            )
        )
        if found:
            return str(found)
    return None


def _visible_rows(namespace: str, principal: Principal, db: Session) -> list[TenantProductStateModel]:
    query = select(TenantProductStateModel).where(
        TenantProductStateModel.tenant_id == principal.tenant_id,
        TenantProductStateModel.namespace == namespace,
    )
    if namespace in EMPLOYEE_NAMESPACES:
        scope = _employee_scope(principal, db)
        if scope is not None:
            if not scope:
                return []
            query = query.where(TenantProductStateModel.subject_employee_id.in_(scope))
    return list(db.scalars(query.order_by(TenantProductStateModel.updated_at.desc())).all())


def _candidate_payload(row: RecruitmentCandidateModel) -> dict[str, Any]:
    return {
        "id": row.id,
        "candidate_source_id": row.candidate_source_id,
        "name": row.full_name,
        "role": row.position or "",
        "email": row.email or "",
        "phone": row.phone or "",
        "department": row.department or "",
        "status": row.status,
        "createdAt": row.created_at.isoformat(),
        "type": "Aday",
        "raw_scores": row.competency_signals_json or {},
        "recruiterNote": row.recruiter_note or "",
        "structuredInterviewCompleted": bool(row.interview_done),
        "workSampleAvailable": bool((row.assessment_summary or "").strip()),
        "referenceChecked": bool(row.reference_checked),
        "testSent": bool(row.test_sent),
    }


def _normalized_scores(raw: Any) -> dict[str, float]:
    result: dict[str, float] = {}
    if not isinstance(raw, dict):
        return result
    for key, value in raw.items():
        try:
            score = float(value)
        except (TypeError, ValueError):
            continue
        result[str(key)] = round(max(0.0, min(5.0, score)), 2)
    return result


@router.get("/bootstrap")
def bootstrap_state(
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    documents: dict[str, list[dict[str, Any]]] = {}
    for namespace in sorted(ALLOWED_NAMESPACES):
        documents[namespace] = [dict(row.payload_json or {}) for row in _visible_rows(namespace, principal, db)]

    candidates: list[dict[str, Any]] = []
    if principal.role.upper() in HR_ROLES:
        rows = db.scalars(
            select(RecruitmentCandidateModel)
            .where(RecruitmentCandidateModel.tenant_id == principal.tenant_id)
            .order_by(RecruitmentCandidateModel.updated_at.desc())
        ).all()
        candidates = [_candidate_payload(row) for row in rows]

    return {"documents": documents, "candidates": candidates, "storage": "server", "tenant_scoped": True}


@router.put("/{namespace}")
def replace_state(
    namespace: str,
    payload: StateReplaceInput,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    if namespace not in ALLOWED_NAMESPACES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported state namespace")

    role = principal.role.upper()
    if namespace in COMPANY_NAMESPACES and role not in HR_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission")
    if namespace in MANAGEMENT_WRITE_NAMESPACES and role not in MANAGEMENT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission")

    scope = _employee_scope(principal, db) if namespace in EMPLOYEE_NAMESPACES else None
    visible_existing = _visible_rows(namespace, principal, db)
    existing_by_key = {row.record_key: row for row in visible_existing}
    incoming_keys: set[str] = set()
    saved: list[dict[str, Any]] = []

    for source in payload.items:
        item = dict(source or {})
        if not item:
            continue
        record_key = str(item.get("id") or item.get("key") or item.get("recordKey") or f"{namespace}-{new_id()}")[:160]
        if record_key in incoming_keys:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Duplicate state record key")
        item["id"] = record_key
        subject = _employee_for_item(item, principal, db) if namespace in EMPLOYEE_NAMESPACES else None

        if namespace == "assessments" and str(item.get("subjectType") or "").lower() == "candidate":
            if role not in HR_ROLES:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Candidate assessment scope is restricted")
            subject = None
        elif namespace == "decision_actions" and subject is None:
            if role not in HR_ROLES:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Employee identity is required for team decision actions")
        elif namespace in EMPLOYEE_NAMESPACES:
            if not subject:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Employee identity is required")
            if scope is not None and subject not in scope:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee is outside your data scope")

        current = existing_by_key.get(record_key)
        if current is None:
            current = TenantProductStateModel(
                tenant_id=principal.tenant_id,
                namespace=namespace,
                record_key=record_key,
                subject_employee_id=subject,
                payload_json=item,
                created_by_user_id=principal.user_id,
            )
            db.add(current)
        else:
            current.subject_employee_id = subject
            current.payload_json = item
            current.updated_at = utcnow()
        incoming_keys.add(record_key)
        saved.append(item)

    # Replace only rows visible to the caller; records outside their employee scope are preserved.
    for row in visible_existing:
        if row.record_key not in incoming_keys:
            db.delete(row)
    db.commit()
    return {"items": saved, "count": len(saved), "storage": "server"}


@router.put("/candidates/sync")
def sync_candidates(
    payload: CandidateSyncInput,
    principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN")),
    db: Session = Depends(get_db),
):
    existing = list(
        db.scalars(
            select(RecruitmentCandidateModel).where(RecruitmentCandidateModel.tenant_id == principal.tenant_id)
        ).all()
    )
    by_id = {row.id: row for row in existing}
    by_source = {row.candidate_source_id: row for row in existing if row.candidate_source_id}

    for source in payload.items:
        item = dict(source or {})
        if item.get("isDemo") or item.get("type") == "Demo Aday":
            continue
        full_name = str(item.get("name") or item.get("full_name") or "").strip()
        if len(full_name) < 2:
            continue
        incoming_id = str(item.get("id") or "")
        source_id = str(
            item.get("candidate_source_id")
            or (f"futurehr-ui-{incoming_id}" if incoming_id else f"futurehr-{new_id()}")
        )[:120]
        row = by_id.get(incoming_id) or by_source.get(source_id)
        if row is None:
            row = RecruitmentCandidateModel(
                tenant_id=principal.tenant_id,
                candidate_source_id=source_id,
                full_name=full_name,
                created_by_user_id=principal.user_id,
            )
            db.add(row)
            db.flush()
            by_id[row.id] = row
            by_source[source_id] = row

        candidate_stage = str(item.get("status") or "Başvuru")
        if candidate_stage not in CANDIDATE_STAGES:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid candidate stage")

        row.full_name = full_name
        row.email = str(item.get("email") or "").strip() or None
        row.phone = str(item.get("phone") or "").strip() or None
        row.department = str(item.get("department") or "").strip() or None
        row.position = str(item.get("role") or item.get("position") or "").strip() or None
        row.status = candidate_stage
        row.competency_signals_json = _normalized_scores(item.get("raw_scores") or item.get("competency_signals") or {})
        row.recruiter_note = str(item.get("recruiterNote") or item.get("recruiter_note") or "")[:4000] or None
        row.interview_done = bool(item.get("structuredInterviewCompleted") or item.get("interview_done"))
        row.reference_checked = bool(item.get("referenceChecked") or item.get("reference_checked"))
        row.test_sent = bool(item.get("testSent") or item.get("test_sent"))
        row.updated_at = utcnow()

    db.commit()
    rows = db.scalars(
        select(RecruitmentCandidateModel)
        .where(RecruitmentCandidateModel.tenant_id == principal.tenant_id)
        .order_by(RecruitmentCandidateModel.updated_at.desc())
    ).all()
    return {"items": [_candidate_payload(row) for row in rows], "count": len(rows), "storage": "server"}
