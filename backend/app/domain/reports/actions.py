from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum, auto

from litestar.exceptions import NotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.config import config
from app.domain.reports.builder import build_report_blocks
from app.domain.reports.enums import ReportState
from app.domain.reports.models import Report, ReportTemplate
from app.domain.reports.pdf import build_report_context, render_report_pdf
from app.domain.reports.schemas import (
    CreateReportData,
    CreateReportTemplateData,
    UpdateReportData,
    UpdateReportTemplateData,
)
from app.domain.reports.state_machine import report_state_machine
from app.domain.surveys.enums import SurveyState
from app.domain.surveys.models import Survey
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse, DownloadFileActionResult
from app.platform.sequences.service import assign_identifier_if_missing
from app.utils.exceptions import ApplicationError


class SurveyNotDeliveredError(ApplicationError):
    status_code = 400
    detail = "Survey must be delivered before a report can be created"


class ReportMissingTemplateError(ApplicationError):
    status_code = 400
    detail = "Report must have a template before it can be rendered"


async def _generate_and_upload_report_pdf(
    obj: Report, transaction: AsyncSession, deps: ActionDeps, *, watermark: bool
) -> tuple[str, str]:
    """Renders `obj`'s PDF, uploads it to S3, and returns (s3_key, download_url)."""
    if obj.template_id is None:
        raise ReportMissingTemplateError

    template = await transaction.get(ReportTemplate, obj.template_id)
    if template is None:
        raise NotFoundException("Report template not found")

    survey = (
        await transaction.execute(select(Survey).where(Survey.id == obj.survey_id).options(joinedload(Survey.vessel)))
    ).scalar_one()

    context = build_report_context(obj, survey, deps.organization)
    pdf_bytes = await render_report_pdf(layout_key=template.layout_key, context=context, watermark=watermark)

    key = f"reports/{obj.id}/{'watermarked' if watermark else 'released'}.pdf"
    await deps.s3.put_bytes(config.S3_DOCUMENTS_BUCKET, key, pdf_bytes, content_type="application/pdf")
    url = deps.s3.generate_presigned_download_url(bucket=config.S3_DOCUMENTS_BUCKET, key=key, expires_in=3600)
    return key, url


class ReportActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    SUBMIT_FOR_REVIEW = auto()
    DELIVER_WATERMARKED = auto()
    RELEASE = auto()


report_actions = action_group_factory(
    group_type=ActionGroupType.REPORT_ACTIONS,
    default_invalidation="/reports",
    model_type=Report,
)


@report_actions
class CreateReport(BaseTopLevelAction[CreateReportData]):
    action_key = ReportActionKey.CREATE
    label = "Create Report"
    icon = ActionIcon.ADD
    priority = 10
    form_entity_fields = {
        "survey_id": {"model": "Survey", "create_action": None},
        "template_id": {"model": "ReportTemplate", "create_action": None},
    }

    @classmethod
    async def execute(
        cls, data: CreateReportData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        survey = await transaction.get(Survey, data.survey_id)
        if survey is None:
            raise NotFoundException("Survey not found")
        if survey.state != SurveyState.delivered:
            raise SurveyNotDeliveredError

        blocks = await build_report_blocks(transaction, survey)
        report = Report(
            organization_id=deps.user.organization_id,
            survey_id=data.survey_id,
            template_id=data.template_id,
            title=data.title,
            blocks=blocks,
        )
        transaction.add(report)
        await transaction.flush()
        return ActionExecutionResponse(
            message="Report created", created_id=report.id, invalidate_queries=["/reports", "/surveys"]
        )


@report_actions
class UpdateReport(BaseObjectAction[Report, UpdateReportData]):
    action_key = ReportActionKey.UPDATE
    label = "Edit Report"
    icon = ActionIcon.EDIT
    priority = 20

    @classmethod
    async def execute(
        cls, obj: Report, data: UpdateReportData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.title = data.title
        obj.summary = data.summary
        obj.market_value_cents = data.market_value_cents
        obj.replacement_value_cents = data.replacement_value_cents
        return ActionExecutionResponse(message="Report updated")


@report_actions
class DeleteReport(BaseObjectAction[Report, EmptyActionData]):
    action_key = ReportActionKey.DELETE
    label = "Delete Report"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Are you sure you want to delete this report?"
    should_redirect_to_parent = True

    @classmethod
    def is_available(cls, obj: Report, deps: ActionDeps) -> bool:
        return obj.state == ReportState.draft

    @classmethod
    async def execute(
        cls, obj: Report, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Report deleted")


@report_actions
class SubmitReportForReview(BaseObjectAction[Report, EmptyActionData]):
    action_key = ReportActionKey.SUBMIT_FOR_REVIEW
    label = "Submit for Review"
    icon = ActionIcon.SEND
    priority = 30

    @classmethod
    def is_available(cls, obj: Report, deps: ActionDeps) -> bool:
        return report_state_machine.can_transition(obj, ReportState.ready_for_review, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Report, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await assign_identifier_if_missing(transaction, obj)
        await deps.sm_service.transition(report_state_machine, obj, ReportState.ready_for_review, actor=deps.user)
        return ActionExecutionResponse(message="Report submitted for review")


@report_actions
class DeliverWatermarked(BaseObjectAction[Report, EmptyActionData]):
    action_key = ReportActionKey.DELIVER_WATERMARKED
    label = "Deliver Watermarked"
    icon = ActionIcon.SEND
    priority = 31

    @classmethod
    def is_available(cls, obj: Report, deps: ActionDeps) -> bool:
        return report_state_machine.can_transition(obj, ReportState.watermarked_delivered, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Report, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        key, url = await _generate_and_upload_report_pdf(obj, transaction, deps, watermark=True)
        obj.watermarked_file_key = key
        await deps.sm_service.transition(report_state_machine, obj, ReportState.watermarked_delivered, actor=deps.user)
        return ActionExecutionResponse(
            message="Watermarked report delivered",
            action_result=DownloadFileActionResult(url=url, filename=f"{obj.identifier}.pdf"),
        )


@report_actions
class ReleaseReport(BaseObjectAction[Report, EmptyActionData]):
    action_key = ReportActionKey.RELEASE
    label = "Release Report"
    icon = ActionIcon.CHECK
    priority = 32

    @classmethod
    def is_available(cls, obj: Report, deps: ActionDeps) -> bool:
        return report_state_machine.can_transition(obj, ReportState.released, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Report, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        key, url = await _generate_and_upload_report_pdf(obj, transaction, deps, watermark=False)
        obj.released_file_key = key
        obj.released_at = datetime.now(tz=UTC)
        await deps.sm_service.transition(report_state_machine, obj, ReportState.released, actor=deps.user)
        return ActionExecutionResponse(
            message="Report released",
            action_result=DownloadFileActionResult(url=url, filename=f"{obj.identifier}.pdf"),
        )


# ── Report template actions ────────────────────────────────────────────────────


class ReportTemplateActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()


report_template_actions = action_group_factory(
    group_type=ActionGroupType.REPORT_TEMPLATE_ACTIONS,
    default_invalidation="/report-templates",
    model_type=ReportTemplate,
)


@report_template_actions
class CreateReportTemplate(BaseTopLevelAction[CreateReportTemplateData]):
    action_key = ReportTemplateActionKey.CREATE
    label = "Create Template"
    icon = ActionIcon.ADD
    priority = 10

    @classmethod
    async def execute(
        cls, data: CreateReportTemplateData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        template = ReportTemplate(
            organization_id=deps.user.organization_id,
            name=data.name,
            layout_key=data.layout_key,
        )
        transaction.add(template)
        await transaction.flush()
        return ActionExecutionResponse(message="Template created", created_id=template.id)


@report_template_actions
class UpdateReportTemplate(BaseObjectAction[ReportTemplate, UpdateReportTemplateData]):
    action_key = ReportTemplateActionKey.UPDATE
    label = "Edit Template"
    icon = ActionIcon.EDIT
    priority = 20

    @classmethod
    async def execute(
        cls, obj: ReportTemplate, data: UpdateReportTemplateData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.name = data.name
        obj.layout_key = data.layout_key
        return ActionExecutionResponse(message="Template updated")


@report_template_actions
class DeleteReportTemplate(BaseObjectAction[ReportTemplate, EmptyActionData]):
    action_key = ReportTemplateActionKey.DELETE
    label = "Delete Template"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Delete this report template?"
    should_redirect_to_parent = True

    @classmethod
    async def execute(
        cls, obj: ReportTemplate, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Template deleted")
