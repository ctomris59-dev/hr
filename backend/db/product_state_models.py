"""Tenant-scoped persistence for product modules that are not yet normalized tables.

This bridge removes production HR state from browser persistence while preserving
strict tenant and employee scope. It is intentionally limited to approved
namespaces and can be replaced by dedicated relational models incrementally.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from db.models import new_id, utcnow


class TenantProductStateModel(Base):
    __tablename__ = "tenant_product_state"
    __table_args__ = (
        UniqueConstraint("tenant_id", "namespace", "record_key", name="uq_product_state_tenant_namespace_key"),
        Index("ix_product_state_tenant_namespace", "tenant_id", "namespace"),
        Index("ix_product_state_tenant_subject", "tenant_id", "subject_employee_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    namespace: Mapped[str] = mapped_column(String(64), nullable=False)
    record_key: Mapped[str] = mapped_column(String(160), nullable=False)
    subject_employee_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=True)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
