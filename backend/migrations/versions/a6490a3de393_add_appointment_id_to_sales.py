"""add appointment_id to sales

Revision ID: add_appointment_id_to_sales
Revises: 
Create Date: 2025-09-09 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "add_appointment_id_to_sales"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("sales") as batch_op:
        batch_op.add_column(sa.Column("appointment_id", sa.Integer(), nullable=True))
    try:
        op.create_foreign_key(
            "fk_sales_appointment_id_appointments",
            "sales",
            "appointments",
            ["appointment_id"],
            ["id"],
            ondelete="SET NULL",
        )
    except Exception:
        # SQLite may not allow FK creation here; it's OK to proceed without it.
        pass


def downgrade():
    try:
        op.drop_constraint(
            "fk_sales_appointment_id_appointments", "sales", type_="foreignkey"
        )
    except Exception:
        pass
    with op.batch_alter_table("sales") as batch_op:
        batch_op.drop_column("appointment_id")