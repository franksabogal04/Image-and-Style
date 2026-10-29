"""add appointment tax snapshot fields

Revision ID: add_appt_tax_snapshot
Revises: 20250910_add_staff_meta
Create Date: 2025-10-17 00:00:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "add_appt_tax_snapshot"
down_revision = "20250910_add_staff_meta"  # <-- chained to staff meta migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite needs batch mode to add multiple columns safely
    with op.batch_alter_table("appointments") as batch:
        # link to tax_rules.id if that table exists in your project
        batch.add_column(sa.Column("tax_rule_id", sa.Integer(), nullable=True))
        # tax rates (store as Numeric or Float—match your models)
        batch.add_column(sa.Column("service_tax_rate", sa.Float(), nullable=True))
        batch.add_column(sa.Column("tip_tax_rate", sa.Float(), nullable=True))
        # computed amounts
        batch.add_column(sa.Column("service_tax_amount", sa.Float(), nullable=True))
        batch.add_column(sa.Column("tip_tax_amount", sa.Float(), nullable=True))
        batch.add_column(sa.Column("total_with_tax", sa.Float(), nullable=True))

    # Optional FK if tax_rules exists (SQLite enforces only with PRAGMA foreign_keys=ON)
    try:
        with op.batch_alter_table("appointments") as batch:
            batch.create_foreign_key(
                "fk_appointments_tax_rule",
                "tax_rules",
                ["tax_rule_id"],
                ["id"],
                ondelete="SET NULL",
            )
    except Exception:
        # If tax_rules doesn't exist yet, skip FK creation
        pass


def downgrade() -> None:
    # Drop FK if present
    try:
        with op.batch_alter_table("appointments") as batch:
            batch.drop_constraint("fk_appointments_tax_rule", type_="foreignkey")
    except Exception:
        pass

    with op.batch_alter_table("appointments") as batch:
        batch.drop_column("total_with_tax")
        batch.drop_column("tip_tax_amount")
        batch.drop_column("service_tax_amount")
        batch.drop_column("tip_tax_rate")
        batch.drop_column("service_tax_rate")
        batch.drop_column("tax_rule_id")