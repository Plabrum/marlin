from __future__ import annotations

from litestar import Router

from app.domain.quotes.models import Quote, QuoteLineItem
from app.domain.quotes.schemas import (
    QuoteDetail,
    QuoteLineItemDetail,
    QuoteLineItemListItem,
    QuoteListItem,
)
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller
from app.platform.data.enums import FieldType
from app.platform.data.service import FieldConfig


def _to_list_item(quote: Quote, user: User) -> QuoteListItem:
    return QuoteListItem(
        id=quote.id,
        identifier=quote.identifier,
        state=quote.state,
        survey_id=quote.survey_id,
        client_id=quote.client_id,
        pricing_guide_id=quote.pricing_guide_id,
        notes=quote.notes,
        total_cents=quote.total_cents,
        created_at=quote.created_at,
    )


def _to_detail(quote: Quote, user: User) -> QuoteDetail:
    return QuoteDetail(
        id=quote.id,
        identifier=quote.identifier,
        state=quote.state,
        survey_id=quote.survey_id,
        client_id=quote.client_id,
        pricing_guide_id=quote.pricing_guide_id,
        notes=quote.notes,
        total_cents=quote.total_cents,
        created_at=quote.created_at,
        updated_at=quote.updated_at,
    )


def _to_line_item_list_item(item: QuoteLineItem, user: User) -> QuoteLineItemListItem:
    return QuoteLineItemListItem(
        id=item.id,
        quote_id=item.quote_id,
        description=item.description,
        quantity=item.quantity,
        unit_price_cents=item.unit_price_cents,
        sort_order=item.sort_order,
        created_at=item.created_at,
    )


def _to_line_item_detail(item: QuoteLineItem, user: User) -> QuoteLineItemDetail:
    return QuoteLineItemDetail(
        id=item.id,
        quote_id=item.quote_id,
        description=item.description,
        quantity=item.quantity,
        unit_price_cents=item.unit_price_cents,
        sort_order=item.sort_order,
        created_at=item.created_at,
    )


_config = CRUDConfig(
    model=Quote,
    to_list_item=_to_list_item,
    to_detail=_to_detail,
    filterable_columns={"state", "survey_id", "client_id", "created_at"},
    sortable_columns={"identifier", "created_at", "total_cents"},
    label_field="identifier",
    data_fields=[
        FieldConfig("total_cents", "Total", FieldType.CENTS),
        FieldConfig("state", "Status", FieldType.ENUM),
        FieldConfig("created_at", "Created", FieldType.DATETIME, aggregatable=False),
    ],
)


_line_item_config = CRUDConfig(
    model=QuoteLineItem,
    to_list_item=_to_line_item_list_item,
    to_detail=_to_line_item_detail,
    filterable_columns={"quote_id", "sort_order"},
    sortable_columns={"sort_order", "created_at"},
    default_sort="sort_order",
)


quote_router = Router(path="/quotes", route_handlers=[make_crud_controller("", _config)], tags=["quotes"])
quote_line_items_router = Router(
    path="/quote-line-items",
    route_handlers=[make_crud_controller("", _line_item_config)],
    tags=["quote_line_items"],
)
