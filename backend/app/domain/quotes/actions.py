from __future__ import annotations

import logging
from enum import StrEnum, auto

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.quotes.enums import QuoteState
from app.domain.quotes.models import Quote, QuoteLineItem
from app.domain.quotes.schemas import (
    AddLineItemData,
    CreateQuoteData,
    UpdateLineItemData,
    UpdateQuoteData,
)
from app.domain.quotes.service import recalculate_totals
from app.domain.quotes.state_machine import quote_state_machine
from app.domain.surveys.enums import SurveyState
from app.domain.surveys.models import Survey
from app.domain.surveys.state_machine import survey_state_machine
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse
from app.platform.sequences.service import assign_identifier_if_missing

logger = logging.getLogger(__name__)


class QuoteActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    SEND = auto()
    ACCEPT = auto()
    DECLINE = auto()


class QuoteLineItemActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    REMOVE = auto()


quote_actions = action_group_factory(
    group_type=ActionGroupType.QUOTE_ACTIONS,
    default_invalidation="/quotes",
    model_type=Quote,
)

quote_line_item_actions = action_group_factory(
    group_type=ActionGroupType.QUOTE_LINE_ITEM_ACTIONS,
    default_invalidation="/quote-line-items",
    model_type=QuoteLineItem,
)


@quote_actions
class CreateQuote(BaseTopLevelAction[CreateQuoteData]):
    action_key = QuoteActionKey.CREATE
    label = "Create Quote"
    icon = ActionIcon.ADD
    priority = 10
    form_entity_fields = {
        "survey_id": {"model": "Survey", "create_action": None},
        "client_id": {"model": "Client", "create_action": None},
        "pricing_guide_id": {"model": "PricingGuide", "create_action": None},
    }

    @classmethod
    async def execute(
        cls, data: CreateQuoteData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        quote = Quote(
            organization_id=deps.user.organization_id,
            survey_id=data.survey_id,
            client_id=data.client_id,
            pricing_guide_id=data.pricing_guide_id,
            notes=data.notes,
        )
        transaction.add(quote)
        await transaction.flush()
        return ActionExecutionResponse(message="Quote created", created_id=quote.id)


@quote_actions
class UpdateQuote(BaseObjectAction[Quote, UpdateQuoteData]):
    action_key = QuoteActionKey.UPDATE
    label = "Edit Quote"
    icon = ActionIcon.EDIT
    priority = 20
    form_entity_fields = {
        "client_id": {"model": "Client", "create_action": None},
        "pricing_guide_id": {"model": "PricingGuide", "create_action": None},
    }

    @classmethod
    async def execute(
        cls, obj: Quote, data: UpdateQuoteData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.client_id = data.client_id
        obj.pricing_guide_id = data.pricing_guide_id
        obj.notes = data.notes
        return ActionExecutionResponse(message="Quote updated")


@quote_actions
class DeleteQuote(BaseObjectAction[Quote, EmptyActionData]):
    action_key = QuoteActionKey.DELETE
    label = "Delete Quote"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Are you sure you want to delete this quote?"
    should_redirect_to_parent = True

    @classmethod
    def is_available(cls, obj: Quote, deps: ActionDeps) -> bool:
        return obj.state == QuoteState.draft

    @classmethod
    async def execute(
        cls, obj: Quote, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Quote deleted")


@quote_actions
class SendQuote(BaseObjectAction[Quote, EmptyActionData]):
    action_key = QuoteActionKey.SEND
    label = "Send Quote"
    icon = ActionIcon.SEND
    priority = 30

    @classmethod
    def is_available(cls, obj: Quote, deps: ActionDeps) -> bool:
        return quote_state_machine.can_transition(obj, QuoteState.sent, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Quote, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await assign_identifier_if_missing(transaction, obj)
        await deps.sm_service.transition(quote_state_machine, obj, QuoteState.sent, actor=deps.user)
        return ActionExecutionResponse(message="Quote sent")


@quote_actions
class AcceptQuote(BaseObjectAction[Quote, EmptyActionData]):
    action_key = QuoteActionKey.ACCEPT
    label = "Mark Accepted"
    icon = ActionIcon.CHECK
    priority = 31

    @classmethod
    def is_available(cls, obj: Quote, deps: ActionDeps) -> bool:
        return quote_state_machine.can_transition(obj, QuoteState.accepted, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Quote, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(quote_state_machine, obj, QuoteState.accepted, actor=deps.user)

        invalidate_queries = ["/quotes"]
        survey = await transaction.get(Survey, obj.survey_id)
        if survey is not None and survey.state == SurveyState.quote:
            await deps.sm_service.transition(survey_state_machine, survey, SurveyState.scheduled, actor=deps.user)
            invalidate_queries += ["/surveys", f"/surveys/{survey.id}"]

        return ActionExecutionResponse(message="Quote marked as accepted", invalidate_queries=invalidate_queries)


@quote_actions
class DeclineQuote(BaseObjectAction[Quote, EmptyActionData]):
    action_key = QuoteActionKey.DECLINE
    label = "Mark Declined"
    icon = ActionIcon.X
    priority = 32
    confirmation_message = "Mark this quote as declined?"

    @classmethod
    def is_available(cls, obj: Quote, deps: ActionDeps) -> bool:
        return quote_state_machine.can_transition(obj, QuoteState.declined, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Quote, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(quote_state_machine, obj, QuoteState.declined, actor=deps.user)
        return ActionExecutionResponse(message="Quote marked as declined")


async def _recalculate_quote_totals_by_id(quote_id: int, transaction: AsyncSession) -> None:
    quote = await transaction.get(Quote, quote_id)
    if quote is None:
        return
    await recalculate_totals(quote, transaction)


@quote_line_item_actions
class AddLineItem(BaseTopLevelAction[AddLineItemData]):
    action_key = QuoteLineItemActionKey.CREATE
    label = "Add Line Item"
    icon = ActionIcon.ADD
    priority = 10

    @classmethod
    async def execute(
        cls, data: AddLineItemData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        quote = await transaction.get(Quote, data.quote_id)
        if quote is None or quote.state != QuoteState.draft:
            return ActionExecutionResponse(message="Cannot add line item")
        item = QuoteLineItem(
            organization_id=deps.user.organization_id,
            quote_id=data.quote_id,
            description=data.description,
            quantity=data.quantity,
            unit_price_cents=data.unit_price_cents,
            sort_order=data.sort_order,
        )
        transaction.add(item)
        await transaction.flush()
        await recalculate_totals(quote, transaction)
        return ActionExecutionResponse(message="Line item added", created_id=item.id)


@quote_line_item_actions
class UpdateLineItem(BaseObjectAction[QuoteLineItem, UpdateLineItemData]):
    action_key = QuoteLineItemActionKey.UPDATE
    label = "Edit Line Item"
    icon = ActionIcon.EDIT
    priority = 20

    @classmethod
    async def execute(
        cls, obj: QuoteLineItem, data: UpdateLineItemData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.description = data.description
        obj.quantity = data.quantity
        obj.unit_price_cents = data.unit_price_cents
        obj.sort_order = data.sort_order
        await transaction.flush()
        await _recalculate_quote_totals_by_id(obj.quote_id, transaction)
        return ActionExecutionResponse(message="Line item updated")


@quote_line_item_actions
class RemoveLineItem(BaseObjectAction[QuoteLineItem, EmptyActionData]):
    action_key = QuoteLineItemActionKey.REMOVE
    label = "Remove Line Item"
    icon = ActionIcon.TRASH
    priority = 30
    confirmation_message = "Remove this line item?"

    @classmethod
    async def execute(
        cls, obj: QuoteLineItem, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        quote_id = obj.quote_id
        await transaction.delete(obj)
        await transaction.flush()
        await _recalculate_quote_totals_by_id(quote_id, transaction)
        return ActionExecutionResponse(message="Line item removed")
