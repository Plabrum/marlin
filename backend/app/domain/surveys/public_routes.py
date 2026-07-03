from __future__ import annotations

from litestar import Router, get
from litestar.exceptions import NotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.reports.models import Report
from app.domain.surveys.models import Survey
from app.domain.surveys.schemas import PublicSurveyDetail
from app.domain.users.models import Organization


@get("/public/surveys/{access_token:str}", exclude_from_auth=True)
async def get_public_survey(access_token: str, db_session: AsyncSession) -> PublicSurveyDetail:
    if not access_token:
        raise NotFoundException()
    result = await db_session.execute(
        select(Survey, Organization)
        .join(Organization, Organization.id == Survey.organization_id)
        .where(Survey.access_token == access_token, Survey.deleted_at.is_(None))
        .options(selectinload(Survey.vessel))
    )
    row = result.first()
    if row is None:
        raise NotFoundException()
    survey, organization = row

    report = (
        await db_session.execute(select(Report).where(Report.survey_id == survey.id, Report.deleted_at.is_(None)))
    ).scalar_one_or_none()
    if report is None:
        raise NotFoundException()

    return PublicSurveyDetail(
        id=survey.id,
        identifier=survey.identifier,
        vessel_name=survey.vessel.name,
        organization_name=organization.name,
        delivered_at=survey.updated_at,
        blocks=report.blocks,
    )


public_survey_router = Router(path="", route_handlers=[get_public_survey], tags=["public-surveys"])
