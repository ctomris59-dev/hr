"""Core relational models for FutureHR SaaS mode.

The SaaS data layer keeps tenant identity on every business record. Stable HR
modules are migrated here incrementally so production authorization never
depends on browser storage.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Index, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TenantModel(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="ACTIVE", nullable=False)
    plan: Mapped[str] = mapped_column(String(32), default="prototype", nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), default="TR", nullable=False)
    locale: Mapped[str] = mapped_column(String(16), default="tr-TR", nullable=False)
    timezone_name: Mapped[str] = mapped_column(String(64), default="Europe/Istanbul", nullable=False)
    settings_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    employees: Mapped[list["EmployeeModel"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    users: Mapped[list["UserModel"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")


class EmployeeModel(Base):
    __tablename__ = "employees"
    __table_args__ = (
        UniqueConstraint("tenant_id", "external_id", name="uq_employees_tenant_external_id"),
        Index("ix_employees_tenant_name", "tenant_id", "full_name"),
        Index("ix_employees_tenant_department", "tenant_id", "department"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    external_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    department: Mapped[str | None] = mapped_column(String(160), nullable=True)
    position: Mapped[str | None] = mapped_column(String(200), nullable=True)
    job_family: Mapped[str | None] = mapped_column(String(160), nullable=True)
    job_level: Mapped[str | None] = mapped_column(String(24), nullable=True)
    manager_employee_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    second_manager_employee_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    hire_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    employment_type: Mapped[str | None] = mapped_column(String(48), nullable=True)
    location: Mapped[str | None] = mapped_column(String(160), nullable=True)
    salary_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    annual_leave_entitlement: Mapped[float] = mapped_column(Float, default=14.0, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    tenant: Mapped[TenantModel] = relationship(back_populates="employees")
    user: Mapped["UserModel | None"] = relationship(back_populates="employee", uselist=False)


class UserModel(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("tenant_id", "username", name="uq_users_tenant_username"),
        UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
        Index("ix_users_tenant_role", "tenant_id", "role"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"), nullable=True, unique=True)
    username: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[str] = mapped_column(String(48), default="PERSONEL", nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    token_version: Mapped[int] = mapped_column(default=1, nullable=False)
    failed_login_attempts: Mapped[int] = mapped_column(default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    tenant: Mapped[TenantModel] = relationship(back_populates="users")
    employee: Mapped[EmployeeModel | None] = relationship(back_populates="user")


class PerformanceEvaluationModel(Base):
    __tablename__ = "performance_evaluations"
    __table_args__ = (
        Index("ix_performance_tenant_employee_date", "tenant_id", "employee_id", "evaluated_at"),
        Index("ix_performance_tenant_evaluator", "tenant_id", "evaluator_user_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    evaluator_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    evaluator_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    evaluation_type: Mapped[str] = mapped_column(String(80), nullable=False, default="Manager")
    authority_context_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    performance_model_version: Mapped[str | None] = mapped_column(String(80), nullable=True)
    kpi_items_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    kpi_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    manager_performance_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    performance_weights_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    final_score: Mapped[float] = mapped_column(Float, nullable=False)
    competency_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    manager_scores_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_star_performer: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class TalentProfileModel(Base):
    __tablename__ = "talent_profiles"
    __table_args__ = (
        UniqueConstraint("tenant_id", "employee_id", name="uq_talent_profiles_tenant_employee"),
        Index("ix_talent_profiles_tenant_employee", "tenant_id", "employee_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    career_aspiration: Mapped[float | None] = mapped_column(Float, nullable=True)
    mobility_willingness: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class DevelopmentPlanModel(Base):
    __tablename__ = "development_plans"
    __table_args__ = (
        Index("ix_development_tenant_employee_status", "tenant_id", "employee_id", "status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    competency: Mapped[str | None] = mapped_column(String(200), nullable=True)
    goal: Mapped[str] = mapped_column(String(500), nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    action_type: Mapped[str] = mapped_column(String(80), nullable=False)
    success_metric: Mapped[str] = mapped_column(Text, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="Planlandı", nullable=False)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    intervention_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reassess_days: Mapped[int | None] = mapped_column(nullable=True)
    transferred_to_training: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class DevelopmentTrainingAssignmentModel(Base):
    __tablename__ = "development_training_assignments"
    __table_args__ = (
        UniqueConstraint("tenant_id", "source_development_plan_id", name="uq_dev_training_tenant_plan"),
        Index("ix_dev_training_tenant_employee", "tenant_id", "employee_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    source_development_plan_id: Mapped[str] = mapped_column(ForeignKey("development_plans.id", ondelete="CASCADE"), nullable=False)
    training_id: Mapped[str] = mapped_column(String(120), nullable=False)
    training_name: Mapped[str] = mapped_column(String(500), nullable=False)
    assigned_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_by_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="Atandı", nullable=False)
    competency_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    transfer_task: Mapped[str | None] = mapped_column(Text, nullable=True)
    success_metric: Mapped[str | None] = mapped_column(Text, nullable=True)


class LeaveRequestModel(Base):
    __tablename__ = "leave_requests"
    __table_args__ = (
        Index("ix_leave_tenant_employee_status", "tenant_id", "employee_id", "status"),
        Index("ix_leave_tenant_dates", "tenant_id", "start_date", "end_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type: Mapped[str] = mapped_column(String(32), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    days: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="Bekliyor", nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class RewardLeaveGrantModel(Base):
    __tablename__ = "reward_leave_grants"
    __table_args__ = (
        Index("ix_reward_leave_tenant_employee", "tenant_id", "employee_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    days: Mapped[float] = mapped_column(Float, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    granted_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    granted_by_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class CompensationBenchmarkModel(Base):
    __tablename__ = "compensation_benchmarks"
    __table_args__ = (
        UniqueConstraint("tenant_id", "department", "position", name="uq_comp_benchmark_tenant_role"),
        Index("ix_comp_benchmark_tenant_role", "tenant_id", "department", "position"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    department: Mapped[str] = mapped_column(String(160), nullable=False)
    position: Mapped[str] = mapped_column(String(200), nullable=False)
    market_average: Mapped[float] = mapped_column(Float, nullable=False)
    source: Mapped[str | None] = mapped_column(String(240), nullable=True)
    updated_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class CompensationCycleModel(Base):
    __tablename__ = "compensation_cycles"
    __table_args__ = (
        Index("ix_comp_cycle_tenant_stage", "tenant_id", "stage"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    stage: Mapped[str] = mapped_column(String(32), default="DRAFT_SIMULATION", nullable=False)
    scenario: Mapped[str | None] = mapped_column(String(8), nullable=True)
    inflation_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    budget_limit: Mapped[float] = mapped_column(Float, default=30.0, nullable=False)
    manager_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    results_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    manager_requests_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    stage_history_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    approved_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
