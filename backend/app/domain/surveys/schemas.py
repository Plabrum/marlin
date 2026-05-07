from datetime import datetime
from typing import Any

from app.domain.surveys.enums import (
    AppraisalPurpose,
    FindingSeverity,
    LossType,
    RecommendationTimeframe,
    SurveyPartyRole,
    SurveyState,
    SurveyType,
    SystemArea,
    VesselStateAtInspection,
)
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class SurveyPartySchema(BaseSchema):
    id: Sqid
    client_id: Sqid
    role: SurveyPartyRole


class FindingSchema(BaseSchema):
    id: Sqid
    title: str
    description: str | None
    system_area: SystemArea | None
    severity: FindingSeverity | None
    location_on_vessel: str | None
    is_pre_existing: bool
    created_at: datetime


class SurveyListItem(BaseSchema):
    id: Sqid
    survey_type: SurveyType
    state: SurveyState
    vessel_id: Sqid
    assigned_surveyor_id: Sqid
    scheduled_for: datetime | None
    created_at: datetime


class SurveyDetail(BaseSchema):
    id: Sqid
    survey_type: SurveyType
    state: SurveyState
    vessel_id: Sqid
    assigned_surveyor_id: Sqid
    template_id: Sqid | None
    vessel_state_at_inspection: VesselStateAtInspection | None
    weather_conditions: str | None
    purpose_statement: str | None
    scope_statement: str | None
    exclusions: str | None
    limitations: str | None
    quoted_fee_cents: int | None
    included_sea_trial: bool
    included_haul_out: bool
    scheduled_for: datetime | None
    inspection_started_at: datetime | None
    inspection_completed_at: datetime | None
    purchase_price_cents: int | None
    seller_name: str | None
    policy_number: str | None
    renewal_required_by: datetime | None
    incident_date: datetime | None
    incident_description: str | None
    loss_type: LossType | None
    claim_number: str | None
    pending_insurer_approval: bool | None
    appraisal_purpose: AppraisalPurpose | None
    effective_date: datetime | None
    parties: list[SurveyPartySchema]
    findings: list[FindingSchema]
    created_at: datetime
    updated_at: datetime


class CreateSurveyData(BaseSchema):
    survey_type: SurveyType
    vessel_id: Sqid
    assigned_surveyor_id: Sqid
    template_id: Sqid | None = None
    scheduled_for: datetime | None = None
    quoted_fee_cents: int | None = None
    purpose_statement: str | None = None
    purchase_price_cents: int | None = None
    seller_name: str | None = None
    policy_number: str | None = None
    incident_description: str | None = None
    loss_type: LossType | None = None
    appraisal_purpose: AppraisalPurpose | None = None


class UpdateSurveyData(BaseSchema):
    assigned_surveyor_id: Sqid
    template_id: Sqid | None
    vessel_state_at_inspection: VesselStateAtInspection | None
    weather_conditions: str | None
    purpose_statement: str | None
    scope_statement: str | None
    exclusions: str | None
    limitations: str | None
    quoted_fee_cents: int | None
    included_sea_trial: bool
    included_haul_out: bool
    scheduled_for: datetime | None
    purchase_price_cents: int | None
    seller_name: str | None
    policy_number: str | None
    renewal_required_by: datetime | None
    incident_date: datetime | None
    incident_description: str | None
    loss_type: LossType | None
    claim_number: str | None
    pending_insurer_approval: bool | None
    appraisal_purpose: AppraisalPurpose | None
    effective_date: datetime | None


class AddSurveyPartyData(BaseSchema):
    client_id: Sqid
    role: SurveyPartyRole


class RemoveSurveyPartyData(BaseSchema):
    survey_party_id: Sqid


class AddFindingData(BaseSchema):
    title: str
    description: str | None = None
    system_area: SystemArea | None = None
    severity: FindingSeverity | None = None
    location_on_vessel: str | None = None
    is_pre_existing: bool = False


class UpdateFindingData(BaseSchema):
    finding_id: Sqid
    title: str
    description: str | None
    system_area: SystemArea | None
    severity: FindingSeverity | None
    location_on_vessel: str | None
    is_pre_existing: bool


class DeleteFindingData(BaseSchema):
    finding_id: Sqid


class AddRecommendationData(BaseSchema):
    finding_id: Sqid
    text: str
    timeframe: RecommendationTimeframe


class UpdateRecommendationData(BaseSchema):
    recommendation_id: Sqid
    finding_id: Sqid
    text: str
    timeframe: RecommendationTimeframe
    is_completed: bool


# Survey template schemas
class SurveyTemplateListItem(BaseSchema):
    id: Sqid
    name: str
    applies_to_survey_types: list[Any]
    created_at: datetime


class SurveyTemplateDetail(BaseSchema):
    id: Sqid
    name: str
    applies_to_survey_types: list[Any]
    definition_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class CreateSurveyTemplateData(BaseSchema):
    name: str
    applies_to_survey_types: list[Any]
    definition_json: dict[str, Any]


class UpdateSurveyTemplateData(BaseSchema):
    name: str
    applies_to_survey_types: list[Any]
    definition_json: dict[str, Any]
