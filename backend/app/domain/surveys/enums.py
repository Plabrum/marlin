from enum import Enum


class SurveyType(Enum):
    pre_purchase = "pre_purchase"
    condition_and_valuation = "condition_and_valuation"
    damage = "damage"
    appraisal = "appraisal"


class SurveyState(Enum):
    inquiry = "inquiry"
    scheduled = "scheduled"
    in_field = "in_field"
    in_draft = "in_draft"
    in_review = "in_review"
    delivered = "delivered"
    paid = "paid"
    cancelled = "cancelled"


class SurveyPartyRole(Enum):
    engaging_party = "engaging_party"
    buyer = "buyer"
    seller = "seller"
    current_owner = "current_owner"
    insurer = "insurer"
    lender = "lender"
    broker = "broker"
    attorney = "attorney"
    other = "other"


class VesselStateAtInspection(Enum):
    afloat = "afloat"
    on_hard = "on_hard"
    on_trailer = "on_trailer"
    in_lift = "in_lift"


class SystemArea(Enum):
    hull = "hull"
    deck = "deck"
    rigging = "rigging"
    propulsion = "propulsion"
    fuel = "fuel"
    electrical_ac = "electrical_ac"
    electrical_dc = "electrical_dc"
    plumbing = "plumbing"
    safety = "safety"
    electronics = "electronics"
    interior = "interior"
    cosmetic = "cosmetic"
    other = "other"


class FindingSeverity(Enum):
    A_safety_critical = "A_safety_critical"
    B_significant = "B_significant"
    C_minor = "C_minor"


class RecommendationTimeframe(Enum):
    immediate = "immediate"
    within_30_days = "within_30_days"
    within_60_days = "within_60_days"
    within_90_days = "within_90_days"
    prior_to_next_haulout = "prior_to_next_haulout"
    monitor_only = "monitor_only"
    informational = "informational"


class ResponseItemStatus(Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    complete = "complete"
    not_applicable = "not_applicable"


class LossType(Enum):
    grounding = "grounding"
    collision = "collision"
    fire = "fire"
    flooding = "flooding"
    storm = "storm"
    theft = "theft"
    vandalism = "vandalism"
    other = "other"


class AppraisalPurpose(Enum):
    insurance = "insurance"
    sale = "sale"
    estate = "estate"
    donation = "donation"
    financing = "financing"
    other = "other"
