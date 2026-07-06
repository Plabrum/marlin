"""Action tests for Report — snapshot generation and the WeasyPrint PDF pipeline."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import config
from app.domain.reports.actions import (
    CreateReport,
    DeliverWatermarked,
    ReleaseReport,
    ReportMissingTemplateError,
    SubmitReportForReview,
    SurveyNotDeliveredError,
)
from app.domain.reports.enums import ReportState
from app.domain.reports.models import Report
from app.domain.reports.schemas import CreateReportData
from app.domain.surveys.enums import SurveyState
from app.domain.surveys.models import Survey
from app.platform.actions.base import EmptyActionData
from app.platform.actions.deps import ActionDeps
from app.platform.clients.s3 import LocalS3Client
from app.platform.form_dsl.enums import FormNodeKind
from app.platform.form_dsl.models import FormNode
from app.platform.state_machine.machine import StateMachineService
from app.utils.sqids import sqid_encode
from tests.factories.reports import ReportFactory, ReportTemplateFactory
from tests.factories.surveys import SurveyFactory
from tests.factories.vessels import VesselFactory


def _make_deps(transaction: AsyncSession, user, org, tmp_path) -> ActionDeps:
    return ActionDeps(
        user=user,
        organization=org,
        request=MagicMock(),
        transaction=transaction,
        config=MagicMock(),
        task_queues=MagicMock(),
        sm_service=StateMachineService(transaction),
        billing=MagicMock(),
        email=MagicMock(),
        s3=LocalS3Client(uploads_dir=tmp_path),
    )


async def _create_survey(db_session: AsyncSession, user, *, state: SurveyState) -> Survey:
    vessel = await VesselFactory.create_async(session=db_session, organization_id=user.organization_id)
    survey = await SurveyFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        vessel_id=vessel.id,
        assigned_surveyor_id=user.id,
        state=state,
    )
    await db_session.flush()
    return survey


async def test_create_report_rejects_non_delivered_survey(db_session: AsyncSession, user, org, tmp_path) -> None:
    survey = await _create_survey(db_session, user, state=SurveyState.in_draft)
    template = await ReportTemplateFactory.create_async(session=db_session, organization_id=user.organization_id)
    await db_session.flush()
    deps = _make_deps(db_session, user, org, tmp_path)

    with pytest.raises(SurveyNotDeliveredError):
        await CreateReport.execute(CreateReportData(survey_id=survey.id, template_id=template.id), db_session, deps)


async def test_create_report_populates_blocks_and_template(db_session: AsyncSession, user, org, tmp_path) -> None:
    survey = await _create_survey(db_session, user, state=SurveyState.delivered)
    section = FormNode(
        organization_id=user.organization_id,
        owner_type=Survey.__tablename__,
        owner_id=survey.id,
        parent_id=None,
        kind=FormNodeKind.section,
        label="Hull",
    )
    db_session.add(section)
    await db_session.flush()
    template = await ReportTemplateFactory.create_async(session=db_session, organization_id=user.organization_id)
    await db_session.flush()
    deps = _make_deps(db_session, user, org, tmp_path)

    response = await CreateReport.execute(
        CreateReportData(survey_id=survey.id, template_id=template.id), db_session, deps
    )

    report = (await db_session.execute(select(Report).where(Report.id == response.created_id))).scalar_one()
    assert report.template_id == template.id
    assert report.blocks == [{"type": "section", "id": sqid_encode(section.id), "label": "Hull"}]


async def test_deliver_watermarked_and_release_generate_pdfs(db_session: AsyncSession, user, org, tmp_path) -> None:
    survey = await _create_survey(db_session, user, state=SurveyState.delivered)
    template = await ReportTemplateFactory.create_async(session=db_session, organization_id=user.organization_id)
    report = await ReportFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        survey_id=survey.id,
        template_id=template.id,
        state=ReportState.draft,
    )
    await db_session.flush()
    deps = _make_deps(db_session, user, org, tmp_path)
    await SubmitReportForReview.execute(report, EmptyActionData(), db_session, deps)

    await DeliverWatermarked.execute(report, EmptyActionData(), db_session, deps)

    assert report.state == ReportState.watermarked_delivered
    assert report.watermarked_file_key == f"reports/{report.id}/watermarked.pdf"
    watermarked_bytes = await deps.s3.get_bytes(config.S3_DOCUMENTS_BUCKET, report.watermarked_file_key)
    assert watermarked_bytes.startswith(b"%PDF")

    await ReleaseReport.execute(report, EmptyActionData(), db_session, deps)

    assert report.state == ReportState.released
    assert report.released_at is not None
    assert report.released_file_key == f"reports/{report.id}/released.pdf"
    released_bytes = await deps.s3.get_bytes(config.S3_DOCUMENTS_BUCKET, report.released_file_key)
    assert released_bytes.startswith(b"%PDF")


async def test_deliver_watermarked_rejects_missing_template(db_session: AsyncSession, user, org, tmp_path) -> None:
    survey = await _create_survey(db_session, user, state=SurveyState.delivered)
    report = await ReportFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        survey_id=survey.id,
        template_id=None,
        state=ReportState.draft,
    )
    await db_session.flush()
    deps = _make_deps(db_session, user, org, tmp_path)
    await SubmitReportForReview.execute(report, EmptyActionData(), db_session, deps)

    with pytest.raises(ReportMissingTemplateError):
        await DeliverWatermarked.execute(report, EmptyActionData(), db_session, deps)
