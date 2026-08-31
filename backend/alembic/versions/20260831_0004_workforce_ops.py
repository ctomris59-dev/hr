"""add development leave and compensation SaaS persistence

Revision ID: 20260831_0004
Revises: 20260831_0003
Create Date: 2026-08-31
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260831_0004"
down_revision = "20260831_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("salary_amount", sa.Float(), nullable=True))
    op.add_column("employees", sa.Column("annual_leave_entitlement", sa.Float(), nullable=False, server_default="14"))

    op.create_table(
        "development_plans",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("employee_id", sa.String(length=36), nullable=False),
        sa.Column("competency", sa.String(length=200), nullable=True),
        sa.Column("goal", sa.String(length=500), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("action_type", sa.String(length=80), nullable=False),
        sa.Column("success_metric", sa.Text(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("created_by_name", sa.String(length=200), nullable=True),
        sa.Column("intervention_id", sa.String(length=120), nullable=True),
        sa.Column("reassess_days", sa.Integer(), nullable=True),
        sa.Column("transferred_to_training", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_development_plans_tenant_id", "development_plans", ["tenant_id"], unique=False)
    op.create_index("ix_development_plans_employee_id", "development_plans", ["employee_id"], unique=False)
    op.create_index("ix_development_tenant_employee_status", "development_plans", ["tenant_id", "employee_id", "status"], unique=False)

    op.create_table(
        "development_training_assignments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("employee_id", sa.String(length=36), nullable=False),
        sa.Column("source_development_plan_id", sa.String(length=36), nullable=False),
        sa.Column("training_id", sa.String(length=120), nullable=False),
        sa.Column("training_name", sa.String(length=500), nullable=False),
        sa.Column("assigned_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("assigned_by_name", sa.String(length=200), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("competency_code", sa.String(length=80), nullable=True),
        sa.Column("transfer_task", sa.Text(), nullable=True),
        sa.Column("success_metric", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["assigned_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_development_plan_id"], ["development_plans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "source_development_plan_id", name="uq_dev_training_tenant_plan"),
    )
    op.create_index("ix_development_training_assignments_tenant_id", "development_training_assignments", ["tenant_id"], unique=False)
    op.create_index("ix_development_training_assignments_employee_id", "development_training_assignments", ["employee_id"], unique=False)
    op.create_index("ix_dev_training_tenant_employee", "development_training_assignments", ["tenant_id", "employee_id"], unique=False)

    op.create_table(
        "leave_requests",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("employee_id", sa.String(length=36), nullable=False),
        sa.Column("leave_type", sa.String(length=32), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("days", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("approved_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("approved_by_name", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["approved_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_leave_requests_tenant_id", "leave_requests", ["tenant_id"], unique=False)
    op.create_index("ix_leave_requests_employee_id", "leave_requests", ["employee_id"], unique=False)
    op.create_index("ix_leave_tenant_employee_status", "leave_requests", ["tenant_id", "employee_id", "status"], unique=False)
    op.create_index("ix_leave_tenant_dates", "leave_requests", ["tenant_id", "start_date", "end_date"], unique=False)

    op.create_table(
        "reward_leave_grants",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("employee_id", sa.String(length=36), nullable=False),
        sa.Column("days", sa.Float(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("granted_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("granted_by_name", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["granted_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reward_leave_grants_tenant_id", "reward_leave_grants", ["tenant_id"], unique=False)
    op.create_index("ix_reward_leave_grants_employee_id", "reward_leave_grants", ["employee_id"], unique=False)
    op.create_index("ix_reward_leave_tenant_employee", "reward_leave_grants", ["tenant_id", "employee_id"], unique=False)

    op.create_table(
        "compensation_benchmarks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("department", sa.String(length=160), nullable=False),
        sa.Column("position", sa.String(length=200), nullable=False),
        sa.Column("market_average", sa.Float(), nullable=False),
        sa.Column("source", sa.String(length=240), nullable=True),
        sa.Column("updated_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "department", "position", name="uq_comp_benchmark_tenant_role"),
    )
    op.create_index("ix_compensation_benchmarks_tenant_id", "compensation_benchmarks", ["tenant_id"], unique=False)
    op.create_index("ix_comp_benchmark_tenant_role", "compensation_benchmarks", ["tenant_id", "department", "position"], unique=False)

    op.create_table(
        "compensation_cycles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("stage", sa.String(length=32), nullable=False),
        sa.Column("scenario", sa.String(length=8), nullable=True),
        sa.Column("inflation_rate", sa.Float(), nullable=True),
        sa.Column("budget_limit", sa.Float(), nullable=False),
        sa.Column("manager_deadline", sa.Date(), nullable=True),
        sa.Column("effective_date", sa.Date(), nullable=True),
        sa.Column("results_json", sa.JSON(), nullable=False),
        sa.Column("manager_requests_json", sa.JSON(), nullable=False),
        sa.Column("stage_history_json", sa.JSON(), nullable=False),
        sa.Column("approved_by", sa.String(length=200), nullable=True),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_compensation_cycles_tenant_id", "compensation_cycles", ["tenant_id"], unique=False)
    op.create_index("ix_comp_cycle_tenant_stage", "compensation_cycles", ["tenant_id", "stage"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_comp_cycle_tenant_stage", table_name="compensation_cycles")
    op.drop_index("ix_compensation_cycles_tenant_id", table_name="compensation_cycles")
    op.drop_table("compensation_cycles")

    op.drop_index("ix_comp_benchmark_tenant_role", table_name="compensation_benchmarks")
    op.drop_index("ix_compensation_benchmarks_tenant_id", table_name="compensation_benchmarks")
    op.drop_table("compensation_benchmarks")

    op.drop_index("ix_reward_leave_tenant_employee", table_name="reward_leave_grants")
    op.drop_index("ix_reward_leave_grants_employee_id", table_name="reward_leave_grants")
    op.drop_index("ix_reward_leave_grants_tenant_id", table_name="reward_leave_grants")
    op.drop_table("reward_leave_grants")

    op.drop_index("ix_leave_tenant_dates", table_name="leave_requests")
    op.drop_index("ix_leave_tenant_employee_status", table_name="leave_requests")
    op.drop_index("ix_leave_requests_employee_id", table_name="leave_requests")
    op.drop_index("ix_leave_requests_tenant_id", table_name="leave_requests")
    op.drop_table("leave_requests")

    op.drop_index("ix_dev_training_tenant_employee", table_name="development_training_assignments")
    op.drop_index("ix_development_training_assignments_employee_id", table_name="development_training_assignments")
    op.drop_index("ix_development_training_assignments_tenant_id", table_name="development_training_assignments")
    op.drop_table("development_training_assignments")

    op.drop_index("ix_development_tenant_employee_status", table_name="development_plans")
    op.drop_index("ix_development_plans_employee_id", table_name="development_plans")
    op.drop_index("ix_development_plans_tenant_id", table_name="development_plans")
    op.drop_table("development_plans")

    op.drop_column("employees", "annual_leave_entitlement")
    op.drop_column("employees", "salary_amount")
