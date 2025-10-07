"""add profession/avatar to users, category to services (with indexes)

Revision ID: 20250910_add_staff_meta
Revises: add_appointment_id_to_sales
Create Date: 2025-09-10 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20250910_add_staff_meta"
down_revision = "add_appointment_id_to_sales"
branch_labels = None
depends_on = None


def upgrade():
    # users: profession + avatar_url (nullable so existing rows are valid)
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("profession", sa.String(), nullable=True))
        batch.add_column(sa.Column("avatar_url", sa.String(), nullable=True))
    op.create_index("ix_users_profession", "users", ["profession"], unique=False)

    # services: category (nullable)
    with op.batch_alter_table("services") as batch:
        batch.add_column(sa.Column("category", sa.String(), nullable=True))
    op.create_index("ix_services_category", "services", ["category"], unique=False)


def downgrade():
    # services
    op.drop_index("ix_services_category", table_name="services")
    with op.batch_alter_table("services") as batch:
        batch.drop_column("category")

    # users
    op.drop_index("ix_users_profession", table_name="users")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("avatar_url")
        batch.drop_column("profession")
