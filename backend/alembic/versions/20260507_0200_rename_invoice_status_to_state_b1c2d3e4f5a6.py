"""rename invoice status to state

Revision ID: b1c2d3e4f5a6
Revises: 0404af517101
Create Date: 2026-05-07 02:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: str | None = "0404af517101"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("invoices", "status", new_column_name="state")


def downgrade() -> None:
    op.alter_column("invoices", "state", new_column_name="status")
