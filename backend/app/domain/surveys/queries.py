from __future__ import annotations

from typing import Any, NamedTuple

import sqlalchemy as sa
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.surveys.models import Survey, SurveyMedia
from app.platform.base.filters import FilterDefinition, SortDefinition, apply_filter, apply_sorts
from app.platform.form_dsl.models import FormNode
from app.utils.sqids import Sqid


async def list_survey_media(
    transaction: AsyncSession,
    *,
    organization_id: int,
    filters: list[FilterDefinition],
    sorts: list[SortDefinition],
    filterable_columns: set[str] | None,
    sortable_columns: set[str] | None,
    default_sort_column: str,
    load_options: list[Any],
    limit: int,
    offset: int,
) -> tuple[list[SurveyMedia], int]:
    base = select(SurveyMedia).where(SurveyMedia.organization_id == organization_id)
    for opt in load_options:
        base = base.options(opt)

    for f in filters:
        base = apply_filter(base, SurveyMedia, f, filterable_columns)

    if sorts:
        base = apply_sorts(base, SurveyMedia, sorts, sortable_columns)
    else:
        base = base.order_by(getattr(SurveyMedia, default_sort_column).desc())

    count_q = select(func.count()).select_from(base.subquery())
    total = (await transaction.execute(count_q)).scalar_one()

    result = await transaction.execute(base.offset(offset).limit(limit))
    rows = list(result.scalars().all())
    return rows, total


async def get_survey_media(
    transaction: AsyncSession,
    *,
    id: Sqid,
    organization_id: int,
    load_options: list[Any],
) -> SurveyMedia | None:
    query = select(SurveyMedia).where(SurveyMedia.id == id, SurveyMedia.organization_id == organization_id)
    for opt in load_options:
        query = query.options(opt)

    result = await transaction.execute(query)
    return result.unique().scalar_one_or_none()


class AdHocSuggestionRow(NamedTuple):
    label: str
    field_type: str | None
    survey_count: int


async def list_ad_hoc_suggestions(transaction: AsyncSession, *, promote_threshold: int) -> list[AdHocSuggestionRow]:
    label_expr = FormNode.label
    type_expr = sa.text("config->>'type'")
    stmt = (
        sa.select(label_expr, type_expr, sa.func.count(sa.distinct(FormNode.owner_id)))
        .where(
            FormNode.owner_type == Survey.__tablename__,
            FormNode.schema_ref.is_(None),
            FormNode.kind == "field",
            FormNode.deleted_at.is_(None),
        )
        .group_by(label_expr, type_expr)
        .having(sa.func.count(sa.distinct(FormNode.owner_id)) >= promote_threshold)
        .order_by(sa.func.count(sa.distinct(FormNode.owner_id)).desc(), label_expr)
    )
    rows = (await transaction.execute(stmt)).all()
    return [AdHocSuggestionRow(label=row[0], field_type=row[1], survey_count=int(row[2])) for row in rows]
