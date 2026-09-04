"""tenant product state bridge

Revision ID: 20260904_0007
Revises: 20260902_0006
Create Date: 2026-09-04
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260904_0007"
down_revision: Union[str, None] = "20260902_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tenant_product_state",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("namespace", sa.String(length=64), nullable=False),
        sa.Column("record_key", sa.String(length=160), nullable=False),
        sa.Column("subject_employee_id", sa.String(length=36), nullable=True),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("created_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "namespace", "record_key", name="uq_product_state_tenant_namespace_key"),
    )
    op.create_index("ix_product_state_tenant_namespace", "tenant_product_state", ["tenant_id", "namespace"], unique=False)
    op.create_index("ix_product_state_tenant_subject", "tenant_product_state", ["tenant_id", "subject_employee_id"], unique=False)
    op.create_index(op.f("ix_tenant_product_state_tenant_id"), "tenant_product_state", ["tenant_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_tenant_product_state_tenant_id"), table_name="tenant_product_state")
    op.drop_index("ix_product_state_tenant_subject", table_name="tenant_product_state")
    op.drop_index("ix_product_state_tenant_namespace", table_name="tenant_product_state")
    op.drop_table("tenant_product_state")
