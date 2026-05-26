"""Embeddings platform tests.

Live OpenAI test is gated on USE_REAL_EMBEDDINGS + OPENAI_API_KEY.
"""

from __future__ import annotations

import os

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.surveys.models import SurveyTemplate
from app.platform.embeddings.client import LocalEmbeddingClient, OpenAIEmbeddingClient
from app.platform.embeddings.events import (
    _PENDING_KEY,
    set_queue_resolver,
    stage_embed_after_insert,
    stage_embed_after_update,
)
from app.platform.embeddings.hash import sha256_bytes
from app.platform.embeddings.mixin import EmbeddableMixin
from app.platform.embeddings.query import nearest
from app.platform.embeddings.tasks import embed_row_task
from tests.factories.surveys import SurveyTemplateFactory
from tests.fixtures.app import make_ctx

# ── unit: mixin shape + helpers ──────────────────────────────────────────────


def test_survey_template_has_embedding_columns():
    cols = {c.name for c in SurveyTemplate.__table__.columns}
    assert {"embedding", "embedded_at", "embedded_model", "embedding_content_hash"} <= cols


def test_survey_template_inherits_embeddable_mixin():
    assert issubclass(SurveyTemplate, EmbeddableMixin)
    assert SurveyTemplate.embedding_columns == ["name"]
    assert SurveyTemplate.embedding_dim == 1536


def test_sha256_bytes_is_32_raw_bytes():
    h = sha256_bytes("hello")
    assert isinstance(h, bytes)
    assert len(h) == 32


def test_is_embedding_stale_when_no_embedding():
    t = SurveyTemplate(name="x", tags=[], definition={}, organization_id=1)
    assert t.is_embedding_stale() is True


def test_is_embedding_stale_when_model_mismatch():
    t = SurveyTemplate(name="x", tags=[], definition={}, organization_id=1)
    t.embedding = [0.0] * 1536
    t.embedded_model = "some-other-model"
    t.embedding_content_hash = sha256_bytes("x")
    assert t.is_embedding_stale() is True


def test_is_embedding_stale_when_hash_mismatch():
    t = SurveyTemplate(name="renamed", tags=[], definition={}, organization_id=1)
    t.embedding = [0.0] * 1536
    t.embedded_model = SurveyTemplate.embedding_model
    t.embedding_content_hash = sha256_bytes("old-content")
    assert t.is_embedding_stale() is True


def test_is_embedding_stale_when_fresh():
    t = SurveyTemplate(name="fresh", tags=[], definition={}, organization_id=1)
    t.embedding = [0.0] * 1536
    t.embedded_model = SurveyTemplate.embedding_model
    t.embedding_content_hash = sha256_bytes(t.embedding_content())
    assert t.is_embedding_stale() is False


# ── listener staging ─────────────────────────────────────────────────────────


async def test_after_insert_stages_pending(db_session: AsyncSession, org):
    t = await SurveyTemplateFactory.create_async(session=db_session, organization_id=org.id)
    # the factory does a flush, which fires after_insert
    stage_embed_after_insert(None, None, t)  # idempotent for assertion
    pending = db_session.info.get(_PENDING_KEY, [])
    assert any(p is t for p in pending)


async def test_after_update_skips_when_unrelated_column_changed(db_session: AsyncSession, org):
    t = await SurveyTemplateFactory.create_async(session=db_session, organization_id=org.id)
    db_session.info.pop(_PENDING_KEY, None)

    t.tags = ["modified"]
    await db_session.flush()
    stage_embed_after_update(None, None, t)
    assert db_session.info.get(_PENDING_KEY, []) == []


async def test_after_update_stages_when_embedding_column_changed(db_session: AsyncSession, org):
    t = await SurveyTemplateFactory.create_async(session=db_session, organization_id=org.id)
    db_session.info.pop(_PENDING_KEY, None)

    t.name = "renamed"
    stage_embed_after_update(None, None, t)
    pending = db_session.info.get(_PENDING_KEY, [])
    assert any(p is t for p in pending)


# ── task: idempotency + writes ───────────────────────────────────────────────


async def test_embed_row_task_writes_vector_and_hash(db_session: AsyncSession, org, monkeypatch):
    monkeypatch.setattr(
        "app.platform.embeddings.tasks.get_embedding_client",
        lambda: LocalEmbeddingClient(),
    )
    t = await SurveyTemplateFactory.create_async(session=db_session, organization_id=org.id, name="Hull Survey")
    await db_session.flush()

    result = await embed_row_task(make_ctx(db_session), transaction=db_session, table="survey_templates", id=int(t.id))
    assert result["status"] == "embedded"
    await db_session.flush()

    assert t.embedding is not None
    assert t.embedded_model == SurveyTemplate.embedding_model
    assert t.embedding_content_hash == sha256_bytes("Hull Survey")
    assert t.embedded_at is not None


async def test_embed_row_task_skips_api_when_fresh(db_session: AsyncSession, org, monkeypatch):
    calls: list[list[str]] = []

    class CountingClient(LocalEmbeddingClient):
        async def embed(self, texts: list[str]) -> list[list[float]]:
            calls.append(list(texts))
            return await super().embed(texts)

    monkeypatch.setattr("app.platform.embeddings.tasks.get_embedding_client", lambda: CountingClient())

    t = await SurveyTemplateFactory.create_async(session=db_session, organization_id=org.id, name="Engine Audit")
    await db_session.flush()

    ctx = make_ctx(db_session)
    await embed_row_task(ctx, transaction=db_session, table="survey_templates", id=int(t.id))
    assert len(calls) == 1

    await embed_row_task(ctx, transaction=db_session, table="survey_templates", id=int(t.id))
    assert len(calls) == 1  # second call short-circuits — hash matched


async def test_embed_row_task_missing_row_returns_status(db_session: AsyncSession, monkeypatch):
    monkeypatch.setattr(
        "app.platform.embeddings.tasks.get_embedding_client",
        lambda: LocalEmbeddingClient(),
    )
    result = await embed_row_task(make_ctx(db_session), transaction=db_session, table="survey_templates", id=999_999)
    assert result["status"] == "missing"


async def test_embed_row_task_unknown_table_returns_status(db_session: AsyncSession):
    result = await embed_row_task(make_ctx(db_session), transaction=db_session, table="not_a_table", id=1)
    assert result["status"] == "no_class"


# ── nearest() ────────────────────────────────────────────────────────────────


async def test_nearest_returns_rows_ordered_by_similarity(db_session: AsyncSession, org, monkeypatch):
    """With a deterministic client that returns the same zero vector for any input,
    all rows tie at cosine distance NaN — pgvector returns them by physical order.
    We just assert the helper executes and returns the requested limit."""
    monkeypatch.setattr(
        "app.platform.embeddings.tasks.get_embedding_client",
        lambda: LocalEmbeddingClient(),
    )
    monkeypatch.setattr(
        "app.platform.embeddings.query.get_embedding_client",
        lambda: _UnitClient(),
    )

    rows = []
    for name in ["Alpha", "Bravo", "Charlie"]:
        row = await SurveyTemplateFactory.create_async(session=db_session, organization_id=org.id, name=name)
        rows.append(row)
    await db_session.flush()

    # Manually populate embeddings — different vectors per row so ordering matters.
    rows[0].embedding = [1.0] + [0.0] * 1535
    rows[1].embedding = [0.0, 1.0] + [0.0] * 1534
    rows[2].embedding = [0.0, 0.0, 1.0] + [0.0] * 1533
    for r in rows:
        r.embedded_model = SurveyTemplate.embedding_model
        r.embedding_content_hash = sha256_bytes(r.name)
    await db_session.flush()

    results = await nearest(db_session, SurveyTemplate, "alpha", limit=3)
    assert len(results) == 3
    # _UnitClient returns the first row's vector for "alpha" — so row[0] ranks first.
    assert results[0][0].name == "Alpha"


class _UnitClient(LocalEmbeddingClient):
    """Client that returns the same vector as rows[0] so it scores highest."""

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [[1.0] + [0.0] * 1535 for _ in texts]


# ── live OpenAI (opt-in) ─────────────────────────────────────────────────────


@pytest.mark.skipif(
    not (os.getenv("USE_REAL_EMBEDDINGS") and os.getenv("OPENAI_API_KEY")),
    reason="set USE_REAL_EMBEDDINGS=1 and OPENAI_API_KEY to run",
)
async def test_openai_client_embeds_live():
    client = OpenAIEmbeddingClient()
    [vec] = await client.embed(["the hull is sound"])
    assert len(vec) == client.dim == 1536
    # not all zero
    assert any(abs(v) > 1e-9 for v in vec)


# ── queue resolver state hygiene ─────────────────────────────────────────────


def test_set_queue_resolver_clears():
    set_queue_resolver(lambda: None)
    set_queue_resolver(None)  # no exception
