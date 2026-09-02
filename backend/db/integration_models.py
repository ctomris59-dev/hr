"""Tenant-scoped persistence models for external HR system ingestion."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from db.models import new_id, utcnow


class IntegrationPayrollRecordModel(Base):
    __tablename__ = "integration_payroll_records"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "provider",
            "employee_id",
            "period",
            name="uq_integration_payroll_tenant_provider_employee_period",
        ),
        Index("ix_integration_payroll_tenant_employee_period", "tenant_id", "employee_id", "period"),
        Index("ix_integration_payroll_tenant_provider_period", "tenant_id", "provider", "period"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_external_id: Mapped[str] = mapped_column(String(80), nullable=False)
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    period: Mapped[str] = mapped_column(String(32), nullable=False)
    gross_salary: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    net_salary: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="TRY", nullable=False)
    ingested_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class IntegrationAttendanceRecordModel(Base):
    __tablename__ = "integration_attendance_records"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "provider",
            "employee_id",
            "work_date",
            name="uq_integration_attendance_tenant_provider_employee_date",
        ),
        Index("ix_integration_attendance_tenant_employee_date", "tenant_id", "employee_id", "work_date"),
        Index("ix_integration_attendance_tenant_provider_date", "tenant_id", "provider", "work_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_external_id: Mapped[str] = mapped_column(String(80), nullable=False)
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    work_date: Mapped[date] = mapped_column(Date, nullable=False)
    first_in: Mapped[str | None] = mapped_column(String(32), nullable=True)
    last_out: Mapped[str | None] = mapped_column(String(32), nullable=True)
    worked_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    overtime_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    absence_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ingested_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
