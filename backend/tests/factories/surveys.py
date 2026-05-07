"""Factories for Survey and related models."""

from faker import Faker
from polyfactory import Use

from app.domain.surveys.enums import (
    FindingSeverity,
    RecommendationTimeframe,
    ResponseItemStatus,
    SurveyPartyRole,
    SurveyType,
)
from app.domain.surveys.models import (
    Finding,
    Recommendation,
    Survey,
    SurveyParty,
    SurveyResponseItem,
    SurveyTemplate,
)

from .base import BaseFactory

fake = Faker()


class SurveyTemplateFactory(BaseFactory):
    __model__ = SurveyTemplate

    name = Use(lambda: f"Template {fake.word()}")
    applies_to_survey_types = Use(lambda: [SurveyType.pre_purchase.value])
    definition_json = Use(lambda: {"sections": []})


class SurveyFactory(BaseFactory):
    __model__ = Survey

    survey_type = SurveyType.pre_purchase.value
    template_id = None
    inspection_location_address_id = None
    vessel_state_at_inspection = None
    weather_conditions = None
    purpose_statement = None
    scope_statement = None
    exclusions = None
    limitations = None
    quoted_fee_cents = None
    included_sea_trial = False
    included_haul_out = False
    scheduled_for = None
    inspection_started_at = None
    inspection_completed_at = None
    purchase_price_cents = None
    seller_name = None
    policy_number = None
    renewal_required_by = None
    incident_date = None
    incident_description = None
    loss_type = None
    claim_number = None
    pending_insurer_approval = None
    appraisal_purpose = None
    effective_date = None

    vessel = None
    assigned_surveyor = None
    template = None
    inspection_location_address = None
    parties = []
    response_items = []
    findings = []


class SurveyPartyFactory(BaseFactory):
    __model__ = SurveyParty

    role = SurveyPartyRole.engaging_party

    survey = None
    client = None


class SurveyResponseItemFactory(BaseFactory):
    __model__ = SurveyResponseItem

    template_node_ref = None
    heading_label = Use(fake.sentence)
    category_path = Use(lambda: [])
    body_text = None
    status = ResponseItemStatus.not_started
    is_finding = False
    sort_order = 0

    survey = None
    findings = []


class FindingFactory(BaseFactory):
    __model__ = Finding

    response_item_id = None
    title = Use(fake.sentence)
    description = None
    system_area = None
    severity = FindingSeverity.C_minor
    location_on_vessel = None
    is_pre_existing = False

    survey = None
    response_item = None
    recommendations = []


class RecommendationFactory(BaseFactory):
    __model__ = Recommendation

    text = Use(fake.sentence)
    timeframe = RecommendationTimeframe.within_30_days
    is_completed = False

    finding = None
