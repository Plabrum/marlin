"""Factories for PricingGuide and PricingTier."""

from faker import Faker

from app.domain.pricing_guides.enums import PricingType, ServiceType
from app.domain.pricing_guides.models import PricingGuide, PricingTier

from .base import BaseFactory

fake = Faker()


class PricingGuideFactory(BaseFactory):
    __model__ = PricingGuide

    name = "Standard rates"
    service_type = ServiceType.pre_purchase
    is_active = True


class PricingTierFactory(BaseFactory):
    __model__ = PricingTier

    length_until_ft = None
    pricing_type = PricingType.flat
    amount_cents = 100000
