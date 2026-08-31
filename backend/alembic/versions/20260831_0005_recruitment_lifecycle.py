"""add tenant scoped recruitment lifecycle persistence

Revision ID: 20260831_0005
Revises: 20260831_0004
Create Date: 2026-08-31
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260831_0005"
down_revision = "20260831_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "recruitment_candidates",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("candidate_source_id", sa.String(length=120), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("phone", sa.String(length=80), nullable=True),
        sa.Column("department", sa.String(length=160), nullable=True),
        sa.Column("position", sa.String(length=200), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("competency_signals_json", sa.JSON(), nullable=False),
        sa.Column("recruiter_note", sa.Text(), nullable=True),
        sa.Column("structured_interview_notes", sa.Text(), nullable=True),
        sa.Column("assessment_summary", sa.Text(), nullable=True),
        sa.Column("interview_done", sa.Boolean(), nullable=False),
        sa.Column("test_sent", sa.Boolean(), nullable=False),
        sa.Column("reference_checked", sa.Boolean(), nullable=False),
        sa.Column("converted_employee_id", sa.String(length=36), nullable=True),
        sa.Column("created_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["converted_employee_id"], ["employees.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "candidate_source_id", name="uq_recruitment_tenant_source"),
    )
    op.create_index("ix_recruitment_candidates_tenant_id", "recruitment_candidates", ["tenant_id"], unique=False)
    op.create_index("ix_recruitment_tenant_status", "recruitment_candidates", ["tenant_id", "status"], unique=False)
    op.create_index("ix_recruitment_tenant_email", "recruitment_candidates", ["tenant_id", "email"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_recruitment_tenant_email", table_name="recruitment_candidates")
    op.drop_index("ix_recruitment_tenant_status", table_name="recruitment_candidates")
    op.drop_index("ix_recruitment_candidates_tenant_id", table_name="recruitment_candidates")
    op.drop_table("recruitment_candidates")
