"""Add threads, messages and thread_read_statuses tables

Revision ID: b9c1d2e3f4a5
Revises: a31bf7c2419d
Create Date: 2026-05-05 08:00:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b9c1d2e3f4a5"
down_revision: str | None = "a31bf7c2419d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "threads",
        sa.Column("threadable_type", sa.Text(), nullable=False),
        sa.Column("threadable_id", sa.Integer(), nullable=False),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("threadable_type", "threadable_id", name="uq_thread_per_object"),
    )
    op.create_index("ix_threads_threadable_type", "threads", ["threadable_type"])
    op.create_index("ix_threads_threadable_id", "threads", ["threadable_id"])

    op.create_table(
        "messages",
        sa.Column("thread_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("content", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["thread_id"], ["threads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_messages_thread_id", "messages", ["thread_id"])
    op.create_index("ix_messages_user_id", "messages", ["user_id"])
    op.create_index("ix_messages_thread_created", "messages", ["thread_id", "created_at"])

    op.create_table(
        "thread_read_statuses",
        sa.Column("thread_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["thread_id"], ["threads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_thread_read_statuses_thread_id", "thread_read_statuses", ["thread_id"])
    op.create_index("ix_thread_read_statuses_user_id", "thread_read_statuses", ["user_id"])
    op.create_index(
        "ix_thread_read_status_lookup",
        "thread_read_statuses",
        ["thread_id", "user_id", "read_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_thread_read_status_lookup", table_name="thread_read_statuses")
    op.drop_index("ix_thread_read_statuses_user_id", table_name="thread_read_statuses")
    op.drop_index("ix_thread_read_statuses_thread_id", table_name="thread_read_statuses")
    op.drop_table("thread_read_statuses")

    op.drop_index("ix_messages_thread_created", table_name="messages")
    op.drop_index("ix_messages_user_id", table_name="messages")
    op.drop_index("ix_messages_thread_id", table_name="messages")
    op.drop_table("messages")

    op.drop_index("ix_threads_threadable_id", table_name="threads")
    op.drop_index("ix_threads_threadable_type", table_name="threads")
    op.drop_table("threads")
