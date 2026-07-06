"""Report PDF rendering — Jinja templates selected by `ReportTemplate.layout_key`."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from app.domain.reports.enums import ReportLayoutKey
from app.domain.reports.models import Report
from app.domain.surveys.models import Survey
from app.domain.users.models import Organization
from app.platform.documents.pdf import make_jinja_env, render_pdf_in_thread, write_pdf

_TEMPLATES_DIR = Path(__file__).parent / "templates"
_ENV = make_jinja_env(_TEMPLATES_DIR)

_LAYOUT_TEMPLATES: dict[ReportLayoutKey, str] = {
    ReportLayoutKey.standard: "standard.html",
}


def build_report_context(report: Report, survey: Survey, organization: Organization) -> dict[str, Any]:
    return {
        "identifier": report.identifier,
        "vessel_name": survey.vessel.name,
        "organization_name": organization.name,
        "organization_footer": organization.report_footer,
        "organization_signature": organization.signature_block,
        "delivered_at": survey.updated_at,
        "blocks": report.blocks,
    }


async def render_report_pdf(*, layout_key: ReportLayoutKey, context: dict[str, Any], watermark: bool) -> bytes:
    template = _ENV.get_template(_LAYOUT_TEMPLATES[layout_key])
    html_str = template.render(**context, watermark=watermark)
    return await render_pdf_in_thread(write_pdf, html_str=html_str)
