from datetime import datetime
from decimal import Decimal

from app.domain.quotes.enums import QuoteState
from app.platform.actions.schemas import ActionableDetail, ActionableList
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class QuoteLineItemListItem(ActionableList):
    id: Sqid
    quote_id: Sqid
    description: str
    quantity: Decimal
    unit_price_cents: int
    sort_order: int
    created_at: datetime


class QuoteLineItemDetail(ActionableDetail):
    id: Sqid
    quote_id: Sqid
    description: str
    quantity: Decimal
    unit_price_cents: int
    sort_order: int
    created_at: datetime


class QuoteListItem(ActionableList):
    id: Sqid
    identifier: str | None
    state: QuoteState
    survey_id: Sqid
    client_id: Sqid
    pricing_guide_id: Sqid | None
    notes: str | None
    total_cents: int
    created_at: datetime


class QuoteDetail(ActionableDetail):
    id: Sqid
    identifier: str | None
    state: QuoteState
    survey_id: Sqid
    client_id: Sqid
    pricing_guide_id: Sqid | None
    notes: str | None
    total_cents: int
    created_at: datetime
    updated_at: datetime


class CreateQuoteData(BaseSchema):
    survey_id: Sqid
    client_id: Sqid
    pricing_guide_id: Sqid | None = None
    notes: str | None = None


class UpdateQuoteData(BaseSchema):
    client_id: Sqid
    pricing_guide_id: Sqid | None
    notes: str | None


class AddLineItemData(BaseSchema):
    quote_id: Sqid
    description: str
    quantity: Decimal
    unit_price_cents: int
    sort_order: int = 0


class UpdateLineItemData(BaseSchema):
    description: str
    quantity: Decimal
    unit_price_cents: int
    sort_order: int
