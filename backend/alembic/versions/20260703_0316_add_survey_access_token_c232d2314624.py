"""add survey access_token

Revision ID: c232d2314624
Revises: b2c3d4e5f6a7
Create Date: 2026-07-03 03:16:31.254419+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c232d2314624"
down_revision: str | None = "b2c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("surveys", sa.Column("access_token", sa.Text(), nullable=True))
    op.create_index(op.f("ix_surveys_access_token"), "surveys", ["access_token"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_surveys_access_token"), table_name="surveys")
    op.drop_column("surveys", "access_token")
