"""add quote total_cents

Revision ID: 8db9b13ad920
Revises: d3e4f5a6b7c8
Create Date: 2026-07-05 18:23:38.408937+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8db9b13ad920"
down_revision: str | None = "d3e4f5a6b7c8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("quotes", sa.Column("total_cents", sa.Integer(), server_default="0", nullable=False))


def downgrade() -> None:
    op.drop_column("quotes", "total_cents")
