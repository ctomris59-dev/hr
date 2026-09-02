"""add tenant scoped payroll and attendance integration ingest tables

Revision ID: 20260902_0006
Revises: 20260831_0005
Create Date: 2026-09-02
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260902_0006"
down_revision = "20260831_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "integration_payroll_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("employee_id", sa.String(length=36), nullable=False),
        sa.Column("employee_external_id", sa.String(length=80), nullable=False),
        sa.Column("provider", sa.String(length=80), nullable=False),
        sa.Column("period", sa.String(length=32), nullable=False),
        sa.Column("gross_salary", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("net_salary", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("ingested_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["ingested_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "provider", "employee_id", "period", name="uq_integration_payroll_tenant_provider_employee_period"),
    )
    op.create_index("ix_integration_payroll_records_tenant_id", "integration_payroll_records", ["tenant_id"], unique=False)
    op.create_index("ix_integration_payroll_records_employee_id", "integration_payroll_records", ["employee_id"], unique=False)
    op.create_index("ix_integration_payroll_tenant_employee_period", "integration_payroll_records", ["tenant_id", "employee_id", "period"], unique=False)
    op.create_index("ix_integration_payroll_tenant_provider_period", "integration_payroll_records", ["tenant_id", "provider", "period"], unique=False)

    op.create_table(
        "integration_attendance_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("employee_id", sa.String(length=36), nullable=False),
        sa.Column("employee_external_id", sa.String(length=80), nullable=False),
        sa.Column("provider", sa.String(length=80), nullable=False),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("first_in", sa.String(length=32), nullable=True),
        sa.Column("last_out", sa.String(length=32), nullable=True),
        sa.Column("worked_minutes", sa.Integer(), nullable=True),
        sa.Column("overtime_minutes", sa.Integer(), nullable=True),
        sa.Column("absence_minutes", sa.Integer(), nullable=True),
        sa.Column("ingested_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["ingested_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "provider", "employee_id", "work_date", name="uq_integration_attendance_tenant_provider_employee_date"),
    )
    op.create_index("ix_integration_attendance_records_tenant_id", "integration_attendance_records", ["tenant_id"], unique=False)
    op.create_index("ix_integration_attendance_records_employee_id", "integration_attendance_records", ["employee_id"], unique=False)
    op.create_index("ix_integration_attendance_tenant_employee_date", "integration_attendance_records", ["tenant_id", "employee_id", "work_date"], unique=False)
    op.create_index("ix_integration_attendance_tenant_provider_date", "integration_attendance_records", ["tenant_id", "provider", "work_date"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_integration_attendance_tenant_provider_date", table_name="integration_attendance_records")
    op.drop_index("ix_integration_attendance_tenant_employee_date", table_name="integration_attendance_records")
    op.drop_index("ix_integration_attendance_records_employee_id", table_name="integration_attendance_records")
    op.drop_index("ix_integration_attendance_records_tenant_id", table_name="integration_attendance_records")
    op.drop_table("integration_attendance_records")

    op.drop_index("ix_integration_payroll_tenant_provider_period", table_name="integration_payroll_records")
    op.drop_index("ix_integration_payroll_tenant_employee_period", table_name="integration_payroll_records")
    op.drop_index("ix_integration_payroll_records_employee_id", table_name="integration_payroll_records")
    op.drop_index("ix_integration_payroll_records_tenant_id", table_name="integration_payroll_records")
    op.drop_table("integration_payroll_records")
