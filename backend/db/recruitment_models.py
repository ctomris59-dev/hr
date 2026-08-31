"""Tenant-scoped recruitment persistence for secure SaaS mode."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from db.models import new_id, utcnow


class RecruitmentCandidateModel(Base):
    __tablename__ = "recruitment_candidates"
    __table_args__ = (
        UniqueConstraint("tenant_id", "candidate_source_id", name="uq_recruitment_tenant_source"),
        Index("ix_recruitment_tenant_status", "tenant_id", "status"),
        Index("ix_recruitment_tenant_email", "tenant_id", "email"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_source_id: Mapped[str] = mapped_column(String(120), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(80), nullable=True)
    department: Mapped[str | None] = mapped_column(String(160), nullable=True)
    position: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="Başvuru", nullable=False)
    competency_signals_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    recruiter_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    structured_interview_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    assessment_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    interview_done: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    test_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reference_checked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    converted_employee_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
