from datetime import datetime
from typing import Any

from app.domain.reports.enums import ReportLayoutKey, ReportState
from app.platform.actions.schemas import ActionableDetail, ActionableList
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class ReportListItem(ActionableList):
    id: Sqid
    state: ReportState
    survey_id: Sqid
    title: str | None
    created_at: datetime


class ReportDetail(ActionableDetail):
    id: Sqid
    state: ReportState
    survey_id: Sqid
    title: str | None
    summary: str | None
    market_value_cents: int | None
    replacement_value_cents: int | None
    watermarked_file_key: str | None
    released_file_key: str | None
    released_at: datetime | None
    blocks: list[Any]
    template_id: Sqid | None
    created_at: datetime
    updated_at: datetime


class CreateReportData(BaseSchema):
    survey_id: Sqid
    template_id: Sqid
    title: str | None = None


class UpdateReportData(BaseSchema):
    title: str | None
    summary: str | None
    market_value_cents: int | None
    replacement_value_cents: int | None


class ReportTemplateListItem(ActionableList):
    id: Sqid
    name: str
    layout_key: ReportLayoutKey


class ReportTemplateDetail(ActionableDetail):
    id: Sqid
    name: str
    layout_key: ReportLayoutKey


class CreateReportTemplateData(BaseSchema):
    name: str
    layout_key: ReportLayoutKey


class UpdateReportTemplateData(BaseSchema):
    name: str
    layout_key: ReportLayoutKey
