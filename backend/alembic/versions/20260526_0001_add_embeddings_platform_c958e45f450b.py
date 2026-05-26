"""add_embeddings_platform

Installs the pgvector extension and adds embedding columns to
survey_templates as the first consumer of the embeddings platform.

Revision ID: c958e45f450b
Revises: 81e5919d2df6
Create Date: 2026-05-26 00:01:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

from alembic import op

revision: str = "c958e45f450b"
down_revision: str | None = "81e5919d2df6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.add_column("survey_templates", sa.Column("embedding", Vector(1536), nullable=True))
    op.add_column("survey_templates", sa.Column("embedded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("survey_templates", sa.Column("embedded_model", sa.String(length=64), nullable=True))
    op.add_column("survey_templates", sa.Column("embedding_content_hash", sa.LargeBinary(length=32), nullable=True))

    op.execute(
        "CREATE INDEX ix_survey_templates_embedding_hnsw ON survey_templates USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_survey_templates_embedding_hnsw")
    op.drop_column("survey_templates", "embedding_content_hash")
    op.drop_column("survey_templates", "embedded_model")
    op.drop_column("survey_templates", "embedded_at")
    op.drop_column("survey_templates", "embedding")
