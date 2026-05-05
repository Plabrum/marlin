"""Add media and documents tables

Revision ID: c1a2b3c4d5e6
Revises: 7e279f9a5e2e, b9c1d2e3f4a5
Create Date: 2026-05-05 08:30:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c1a2b3c4d5e6"
down_revision: str | tuple[str, ...] | None = ("7e279f9a5e2e", "b9c1d2e3f4a5")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "media",
        sa.Column("file_key", sa.Text(), nullable=False),
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("file_type", sa.Text(), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("mime_type", sa.Text(), nullable=False),
        sa.Column("thumbnail_key", sa.Text(), nullable=True),
        sa.Column("state", sa.Text(), nullable=False, server_default="PENDING"),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_key"),
    )
    op.create_index("ix_media_state", "media", ["state"])

    op.create_table(
        "documents",
        sa.Column("file_key", sa.Text(), nullable=False),
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("file_type", sa.Text(), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("mime_type", sa.Text(), nullable=False),
        sa.Column("thumbnail_key", sa.Text(), nullable=True),
        sa.Column("state", sa.Text(), nullable=False, server_default="PENDING"),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_key"),
    )
    op.create_index("ix_documents_state", "documents", ["state"])


def downgrade() -> None:
    op.drop_index("ix_documents_state", table_name="documents")
    op.drop_table("documents")
    op.drop_index("ix_media_state", table_name="media")
    op.drop_table("media")
