"""add appointment payments

Revision ID: 3ad252eee8f8
Revises: 20260815_sale_tax_snapshot
Create Date: 2026-08-20 00:32:02.460784

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3ad252eee8f8"
down_revision: Union[str, Sequence[str], None] = "20260815_sale_tax_snapshot"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    existing_tables = inspector.get_table_names()

    if "payments" not in existing_tables:
        op.create_table(
            "payments",

            sa.Column(
                "id",
                sa.Integer(),
                nullable=False,
            ),

            sa.Column(
                "appointment_id",
                sa.Integer(),
                nullable=False,
            ),

            sa.Column(
                "amount",
                sa.Float(),
                nullable=False,
            ),

            sa.Column(
                "tip_amount",
                sa.Float(),
                nullable=False,
            ),

            sa.Column(
                "method",
                sa.String(),
                nullable=False,
            ),

            sa.Column(
                "status",
                sa.String(),
                nullable=False,
            ),

            sa.Column(
                "stripe_checkout_session_id",
                sa.String(),
                nullable=True,
            ),

            sa.Column(
                "stripe_payment_intent_id",
                sa.String(),
                nullable=True,
            ),

            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
            ),

            sa.ForeignKeyConstraint(
                ["appointment_id"],
                ["appointments.id"],
                ondelete="CASCADE",
            ),

            sa.PrimaryKeyConstraint(
                "id",
            ),
        )


        op.create_index(
            "ix_payments_id",
            "payments",
            ["id"],
            unique=False,
        )


        op.create_index(
            "ix_payments_appointment_id",
            "payments",
            ["appointment_id"],
            unique=False,
        )


        op.create_index(
            "ix_payments_status",
            "payments",
            ["status"],
            unique=False,
        )


        op.create_index(
            "ix_payments_stripe_checkout_session_id",
            "payments",
            ["stripe_checkout_session_id"],
            unique=True,
        )


        op.create_index(
            "ix_payments_stripe_payment_intent_id",
            "payments",
            ["stripe_payment_intent_id"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    existing_tables = inspector.get_table_names()

    if "payments" in existing_tables:
        op.drop_table(
            "payments"
        )