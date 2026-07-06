"""Factories for Report and ReportTemplate."""

from faker import Faker
from polyfactory import Use

from app.domain.reports.enums import ReportLayoutKey
from app.domain.reports.models import Report, ReportTemplate

from .base import BaseFactory

fake = Faker()


class ReportTemplateFactory(BaseFactory):
    __model__ = ReportTemplate

    name = Use(lambda: f"Template {fake.word()}")
    layout_key = ReportLayoutKey.standard


class ReportFactory(BaseFactory):
    __model__ = Report

    title = None
    summary = None
    market_value_cents = None
    replacement_value_cents = None
    watermarked_file_key = None
    released_file_key = None
    released_at = None
    template_id = None

    survey = None
    organization = None
    template = None
