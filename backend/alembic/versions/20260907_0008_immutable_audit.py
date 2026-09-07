"""immutable audit event chain

Revision ID: 20260907_0008
Revises: 20260904_0007
"""
from alembic import op
import sqlalchemy as sa

revision = "20260907_0008"
down_revision = "20260904_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_events_immutable",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("event_id", sa.String(length=36), nullable=False, unique=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("event_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("previous_hash", sa.String(length=64), nullable=True),
        sa.Column("event_hash", sa.String(length=64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_immutable_timestamp", "audit_events_immutable", ["event_timestamp"])
    op.create_index("ix_audit_immutable_type", "audit_events_immutable", ["event_type"])
    op.create_index("ix_audit_immutable_event_id", "audit_events_immutable", ["event_id"], unique=True)

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("""
        CREATE OR REPLACE FUNCTION futurehr_reject_audit_mutation()
        RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'FutureHR audit events are append-only';
        END;
        $$ LANGUAGE plpgsql;
        """)
        op.execute("""
        CREATE TRIGGER trg_futurehr_audit_no_update
        BEFORE UPDATE OR DELETE ON audit_events_immutable
        FOR EACH ROW EXECUTE FUNCTION futurehr_reject_audit_mutation();
        """)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS trg_futurehr_audit_no_update ON audit_events_immutable")
        op.execute("DROP FUNCTION IF EXISTS futurehr_reject_audit_mutation()")
    op.drop_index("ix_audit_immutable_event_id", table_name="audit_events_immutable")
    op.drop_index("ix_audit_immutable_type", table_name="audit_events_immutable")
    op.drop_index("ix_audit_immutable_timestamp", table_name="audit_events_immutable")
    op.drop_table("audit_events_immutable")
