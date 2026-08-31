"""add performance evaluations and talent profiles

Revision ID: 20260831_0003
Revises: 20260830_0002
Create Date: 2026-08-31
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260831_0003"
down_revision = "20260830_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "performance_evaluations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("employee_id", sa.String(length=36), nullable=False),
        sa.Column("evaluator_user_id", sa.String(length=36), nullable=True),
        sa.Column("evaluator_name", sa.String(length=200), nullable=True),
        sa.Column("evaluation_type", sa.String(length=80), nullable=False),
        sa.Column("authority_context_json", sa.JSON(), nullable=False),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("performance_model_version", sa.String(length=80), nullable=True),
        sa.Column("kpi_items_json", sa.JSON(), nullable=False),
        sa.Column("kpi_score", sa.Float(), nullable=True),
        sa.Column("manager_performance_score", sa.Float(), nullable=True),
        sa.Column("performance_weights_json", sa.JSON(), nullable=False),
        sa.Column("final_score", sa.Float(), nullable=False),
        sa.Column("competency_score", sa.Float(), nullable=True),
        sa.Column("manager_scores_json", sa.JSON(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("is_star_performer", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["evaluator_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_performance_evaluations_tenant_id", "performance_evaluations", ["tenant_id"], unique=False)
    op.create_index("ix_performance_evaluations_employee_id", "performance_evaluations", ["employee_id"], unique=False)
    op.create_index("ix_performance_tenant_employee_date", "performance_evaluations", ["tenant_id", "employee_id", "evaluated_at"], unique=False)
    op.create_index("ix_performance_tenant_evaluator", "performance_evaluations", ["tenant_id", "evaluator_user_id"], unique=False)

    op.create_table(
        "talent_profiles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("employee_id", sa.String(length=36), nullable=False),
        sa.Column("career_aspiration", sa.Float(), nullable=True),
        sa.Column("mobility_willingness", sa.Float(), nullable=True),
        sa.Column("updated_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "employee_id", name="uq_talent_profiles_tenant_employee"),
    )
    op.create_index("ix_talent_profiles_tenant_id", "talent_profiles", ["tenant_id"], unique=False)
    op.create_index("ix_talent_profiles_employee_id", "talent_profiles", ["employee_id"], unique=False)
    op.create_index("ix_talent_profiles_tenant_employee", "talent_profiles", ["tenant_id", "employee_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_talent_profiles_tenant_employee", table_name="talent_profiles")
    op.drop_index("ix_talent_profiles_employee_id", table_name="talent_profiles")
    op.drop_index("ix_talent_profiles_tenant_id", table_name="talent_profiles")
    op.drop_table("talent_profiles")

    op.drop_index("ix_performance_tenant_evaluator", table_name="performance_evaluations")
    op.drop_index("ix_performance_tenant_employee_date", table_name="performance_evaluations")
    op.drop_index("ix_performance_evaluations_employee_id", table_name="performance_evaluations")
    op.drop_index("ix_performance_evaluations_tenant_id", table_name="performance_evaluations")
    op.drop_table("performance_evaluations")
