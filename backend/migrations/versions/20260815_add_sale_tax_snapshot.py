"""add sale tax snapshot fields

Revision ID: 20260815_sale_tax_snapshot
Revises: add_appt_tax_snapshot
Create Date: 2026-08-15
"""

from alembic import op
import sqlalchemy as sa


revision = "20260815_sale_tax_snapshot"
down_revision = "add_appt_tax_snapshot"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("sales") as batch:
        batch.add_column(
            sa.Column(
                "tax_rule_id",
                sa.Integer(),
                nullable=True,
            )
        )

        batch.add_column(
            sa.Column(
                "retail_tax_rate",
                sa.Float(),
                nullable=True,
            )
        )

        batch.add_column(
            sa.Column(
                "retail_tax_amount",
                sa.Float(),
                nullable=True,
            )
        )

        batch.add_column(
            sa.Column(
                "total_with_tax",
                sa.Float(),
                nullable=True,
            )
        )

        batch.create_foreign_key(
            "fk_sales_tax_rule_id",
            "tax_rules",
            ["tax_rule_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("sales") as batch:
        batch.drop_constraint(
            "fk_sales_tax_rule_id",
            type_="foreignkey",
        )

        batch.drop_column(
            "total_with_tax"
        )

        batch.drop_column(
            "retail_tax_amount"
        )

        batch.drop_column(
            "retail_tax_rate"
        )

        batch.drop_column(
            "tax_rule_id"
        )