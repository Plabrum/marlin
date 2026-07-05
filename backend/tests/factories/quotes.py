"""Factories for Quote and QuoteLineItem."""

from decimal import Decimal

from faker import Faker
from polyfactory import Use

from app.domain.quotes.models import Quote, QuoteLineItem

from .base import BaseFactory

fake = Faker()


class QuoteFactory(BaseFactory):
    __model__ = Quote

    identifier = None
    pricing_guide_id = None
    total_cents = 0
    notes = None

    line_items = []


class QuoteLineItemFactory(BaseFactory):
    __model__ = QuoteLineItem

    description = Use(fake.sentence)
    quantity = Decimal("1.00")
    unit_price_cents = 10000
    sort_order = 0

    quote = None
