"""Tenant-scoped recruitment lifecycle API for FutureHR SaaS mode.

Production recruitment records live in the relational tenant boundary. Candidate
conversion is atomic: the candidate is marked as hired and the employee master
record is created in the same transaction so lifecycle provenance cannot drift.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from core.auth import Principal, require_roles
from core.database import get_db
from db.models import EmployeeModel, new_id
from db.recruitment_models import RecruitmentCandidateModel

router = APIRouter(prefix="/api/v1/recruitment", tags=["Recruitment SaaS"])
RECRUITMENT_ROLES = ("CEO", "IK", "HR_ADMIN")
CandidateStage = Literal["Başvuru", "Ön Eleme", "Test", "Mülakat", "Teklif", "İşe Alındı", "Reddedildi"]


class CandidateCreateInput(BaseModel):
    candidate_source_id: str | None = Field(default=None, max_length=120)
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=80)
    department: str | None = Field(default=None, max_length=160)
    position: str | None = Field(default=None, max_length=200)
    status: CandidateStage = "Başvuru"
    competency_signals: dict[str, float] = Field(default_factory=dict)
    recruiter_note: str | None = Field(default=None, max_length=4000)
    structured_interview_notes: str | None = Field(default=None, max_length=8000)
    assessment_summary: str | None = Field(default=None, max_length=8000)
    interview_done: bool = False
    test_sent: bool = False
    reference_checked: bool = False


class CandidateUpdateInput(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=80)
    department: str | None = Field(default=None, max_length=160)
    position: str | None = Field(default=None, max_length=200)
    status: CandidateStage | None = None
    competency_signals: dict[str, float] | None = None
    recruiter_note: str | None = Field(default=None, max_length=4000)
    structured_interview_notes: str | None = Field(default=None, max_length=8000)
    assessment_summary: str | None = Field(default=None, max_length=8000)
    interview_done: bool | None = None
    test_sent: bool | None = None
    reference_checked: bool | None = None


class CandidateConvertInput(BaseModel):
    department: str | None = Field(default=None, max_length=160)
    position: str | None = Field(default=None, max_length=200)
    job_family: str | None = Field(default=None, max_length=160)
    job_level: str | None = Field(default=None, max_length=24)
    hire_date: date | None = None
    employment_type: str | None = Field(default=None, max_length=48)
    location: str | None = Field(default=None, max_length=160)


def _candidate_or_404(db: Session, tenant_id: str, candidate_id: str) -> RecruitmentCandidateModel:
    candidate = db.scalar(
        select(RecruitmentCandidateModel).where(
            RecruitmentCandidateModel.id == candidate_id,
            RecruitmentCandidateModel.tenant_id == tenant_id,
        )
    )
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    return candidate


def _validate_competencies(values: dict[str, float] | None) -> dict[str, float]:
    result: dict[str, float] = {}
    for key, raw in (values or {}).items():
        try:
            value = float(raw)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid competency score: {key}") from exc
        if value < 0 or value > 5:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid competency score: {key}")
        result[str(key)] = round(value, 2)
    return result


def _serialize(candidate: RecruitmentCandidateModel) -> dict:
    return {
        "id": candidate.id,
        "candidate_source_id": candidate.candidate_source_id,
        "full_name": candidate.full_name,
        "email": candidate.email,
        "phone": candidate.phone,
        "department": candidate.department,
        "position": candidate.position,
        "status": candidate.status,
        "competency_signals": candidate.competency_signals_json or {},
        "recruiter_note": candidate.recruiter_note,
        "structured_interview_notes": candidate.structured_interview_notes,
        "assessment_summary": candidate.assessment_summary,
        "interview_done": candidate.interview_done,
        "test_sent": candidate.test_sent,
        "reference_checked": candidate.reference_checked,
        "converted_employee_id": candidate.converted_employee_id,
        "created_at": candidate.created_at.isoformat(),
        "updated_at": candidate.updated_at.isoformat(),
    }


@router.get("/candidates")
def list_candidates(
    q: str | None = Query(default=None, max_length=200),
    stage: CandidateStage | None = Query(default=None),
    principal: Principal = Depends(require_roles(*RECRUITMENT_ROLES)),
    db: Session = Depends(get_db),
):
    query = select(RecruitmentCandidateModel).where(RecruitmentCandidateModel.tenant_id == principal.tenant_id)
    if stage:
        query = query.where(RecruitmentCandidateModel.status == stage)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.where(
            or_(
                RecruitmentCandidateModel.full_name.ilike(term),
                RecruitmentCandidateModel.email.ilike(term),
                RecruitmentCandidateModel.position.ilike(term),
                RecruitmentCandidateModel.department.ilike(term),
            )
        )
    rows = list(db.scalars(query.order_by(RecruitmentCandidateModel.updated_at.desc())).all())
    return {"items": [_serialize(row) for row in rows], "total": len(rows)}


@router.get("/candidates/{candidate_id}")
def get_candidate(
    candidate_id: str,
    principal: Principal = Depends(require_roles(*RECRUITMENT_ROLES)),
    db: Session = Depends(get_db),
):
    return _serialize(_candidate_or_404(db, principal.tenant_id, candidate_id))


@router.post("/candidates", status_code=status.HTTP_201_CREATED)
def create_candidate(
    payload: CandidateCreateInput,
    principal: Principal = Depends(require_roles(*RECRUITMENT_ROLES)),
    db: Session = Depends(get_db),
):
    source_id = (payload.candidate_source_id or f"futurehr-{new_id()}").strip()
    existing = db.scalar(
        select(RecruitmentCandidateModel).where(
            RecruitmentCandidateModel.tenant_id == principal.tenant_id,
            RecruitmentCandidateModel.candidate_source_id == source_id,
        )
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Candidate source id already exists")
    candidate = RecruitmentCandidateModel(
        tenant_id=principal.tenant_id,
        candidate_source_id=source_id,
        full_name=payload.full_name.strip(),
        email=str(payload.email) if payload.email else None,
        phone=payload.phone,
        department=payload.department,
        position=payload.position,
        status=payload.status,
        competency_signals_json=_validate_competencies(payload.competency_signals),
        recruiter_note=payload.recruiter_note,
        structured_interview_notes=payload.structured_interview_notes,
        assessment_summary=payload.assessment_summary,
        interview_done=payload.interview_done,
        test_sent=payload.test_sent,
        reference_checked=payload.reference_checked,
        created_by_user_id=principal.user_id,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return _serialize(candidate)


@router.patch("/candidates/{candidate_id}")
def update_candidate(
    candidate_id: str,
    payload: CandidateUpdateInput,
    principal: Principal = Depends(require_roles(*RECRUITMENT_ROLES)),
    db: Session = Depends(get_db),
):
    candidate = _candidate_or_404(db, principal.tenant_id, candidate_id)
    if candidate.converted_employee_id and payload.status not in (None, "İşe Alındı"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Converted candidate stage is locked to hired")
    values = payload.model_dump(exclude_unset=True)
    mapping = {
        "competency_signals": "competency_signals_json",
    }
    for field, value in values.items():
        target = mapping.get(field, field)
        if field == "competency_signals":
            value = _validate_competencies(value)
        elif field == "email" and value is not None:
            value = str(value)
        elif field == "full_name" and value is not None:
            value = value.strip()
        setattr(candidate, target, value)
    candidate.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(candidate)
    return _serialize(candidate)


@router.post("/candidates/{candidate_id}/convert", status_code=status.HTTP_201_CREATED)
def convert_candidate(
    candidate_id: str,
    payload: CandidateConvertInput,
    principal: Principal = Depends(require_roles(*RECRUITMENT_ROLES)),
    db: Session = Depends(get_db),
):
    candidate = _candidate_or_404(db, principal.tenant_id, candidate_id)
    if candidate.converted_employee_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Candidate has already been converted to an employee")
    if candidate.email:
        duplicate = db.scalar(
            select(EmployeeModel).where(
                EmployeeModel.tenant_id == principal.tenant_id,
                EmployeeModel.email.ilike(candidate.email),
                EmployeeModel.active.is_(True),
            )
        )
        if duplicate:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An active employee with this email already exists")

    converted_at = datetime.now(timezone.utc).isoformat()
    metadata = {
        "lifecycle_source": "recruitment",
        "candidate_source_id": candidate.candidate_source_id,
        "candidate_record_id": candidate.id,
        "candidate_converted_at": converted_at,
        "candidate_assessment_summary": candidate.assessment_summary,
        "candidate_competency_signals": candidate.competency_signals_json or {},
        "candidate_conversion_actor": principal.user_id,
        "candidate_evidence": {
            "interview_done": candidate.interview_done,
            "test_sent": candidate.test_sent,
            "reference_checked": candidate.reference_checked,
            "structured_interview_notes_available": bool(candidate.structured_interview_notes),
        },
    }
    employee = EmployeeModel(
        tenant_id=principal.tenant_id,
        full_name=candidate.full_name,
        email=candidate.email,
        department=payload.department or candidate.department,
        position=payload.position or candidate.position,
        job_family=payload.job_family,
        job_level=payload.job_level,
        hire_date=payload.hire_date,
        employment_type=payload.employment_type,
        location=payload.location,
        active=True,
        metadata_json=metadata,
    )
    db.add(employee)
    db.flush()
    candidate.converted_employee_id = employee.id
    candidate.status = "İşe Alındı"
    candidate.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(employee)
    db.refresh(candidate)
    return {
        "candidate": _serialize(candidate),
        "employee": {
            "id": employee.id,
            "full_name": employee.full_name,
            "department": employee.department,
            "position": employee.position,
            "lifecycle_source": "recruitment",
        },
        "next_step": "Onboarding, ilk 90 gün hedefleri ve Digital Twin artık çalışan ana verisi üzerinden devam eder.",
    }
