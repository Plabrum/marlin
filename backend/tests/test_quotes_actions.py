"""Action tests for Quote and QuoteLineItem."""

from __future__ import annotations

from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.quotes.actions import (
    AcceptQuote,
    AddLineItem,
    CreateQuote,
    DeclineQuote,
    DeleteQuote,
    RemoveLineItem,
    SendQuote,
    UpdateLineItem,
    UpdateQuote,
)
from app.domain.quotes.enums import QuoteState
from app.domain.quotes.models import Quote, QuoteLineItem
from app.domain.quotes.schemas import (
    AddLineItemData,
    CreateQuoteData,
    UpdateLineItemData,
    UpdateQuoteData,
)
from app.domain.quotes.state_machine import quote_state_machine
from app.domain.surveys.enums import SurveyState
from app.platform.actions.base import EmptyActionData
from app.platform.actions.deps import ActionDeps
from app.platform.state_machine.exceptions import InvalidTransitionError
from app.platform.state_machine.machine import StateMachineService
from app.utils.sqids import Sqid
from tests.factories.clients import ClientFactory
from tests.factories.quotes import QuoteFactory
from tests.factories.surveys import SurveyFactory
from tests.factories.vessels import VesselFactory


def _make_deps(transaction: AsyncSession, user) -> ActionDeps:
    return ActionDeps(
        user=user,
        organization=MagicMock(id=user.organization_id),
        request=MagicMock(),
        transaction=transaction,
        config=MagicMock(),
        task_queues=MagicMock(),
        sm_service=StateMachineService(transaction),
        billing=MagicMock(),
        email=MagicMock(),
    )


async def _create_survey_and_client(db_session: AsyncSession, user) -> tuple[Sqid, Sqid]:
    vessel = await VesselFactory.create_async(session=db_session, organization_id=user.organization_id)
    survey = await SurveyFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        vessel_id=vessel.id,
        assigned_surveyor_id=user.id,
        state=SurveyState.in_draft,
    )
    client = await ClientFactory.create_async(session=db_session, organization_id=user.organization_id)
    await db_session.flush()
    return survey.id, client.id


async def _create_quote(db_session: AsyncSession, user, **kwargs) -> Quote:
    survey_id, client_id = await _create_survey_and_client(db_session, user)
    kwargs.setdefault("state", QuoteState.draft)
    quote = await QuoteFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        survey_id=survey_id,
        client_id=client_id,
        pricing_guide_id=None,
        **kwargs,
    )
    await db_session.flush()
    return quote


async def test_create_happy_path(db_session: AsyncSession, user) -> None:
    survey_id, client_id = await _create_survey_and_client(db_session, user)
    deps = _make_deps(db_session, user)
    data = CreateQuoteData(survey_id=survey_id, client_id=client_id, pricing_guide_id=None, notes="Initial quote")

    response = await CreateQuote.execute(data, db_session, deps)

    assert response.created_id is not None
    quote = (await db_session.execute(select(Quote).where(Quote.id == response.created_id))).scalar_one()
    assert quote.state == QuoteState.draft
    assert quote.survey_id == survey_id
    assert quote.client_id == client_id
    assert quote.notes == "Initial quote"
    assert quote.total_cents == 0


async def test_update_happy_path(db_session: AsyncSession, user) -> None:
    quote = await _create_quote(db_session, user)
    deps = _make_deps(db_session, user)

    other_client = await ClientFactory.create_async(session=db_session, organization_id=user.organization_id)
    await db_session.flush()
    data = UpdateQuoteData(client_id=other_client.id, pricing_guide_id=None, notes="Updated notes")

    await UpdateQuote.execute(quote, data, db_session, deps)

    assert quote.client_id == other_client.id
    assert quote.notes == "Updated notes"


async def test_delete_only_in_draft(db_session: AsyncSession, user) -> None:
    quote = await _create_quote(db_session, user, state=QuoteState.draft)
    deps = _make_deps(db_session, user)

    assert DeleteQuote.is_available(quote, deps) is True
    await DeleteQuote.execute(quote, EmptyActionData(), db_session, deps)
    assert quote.deleted_at is not None


async def test_delete_blocked_when_sent(db_session: AsyncSession, user) -> None:
    quote = await _create_quote(db_session, user, state=QuoteState.sent)
    deps = _make_deps(db_session, user)

    assert DeleteQuote.is_available(quote, deps) is False


async def test_send_assigns_identifier_and_transitions(db_session: AsyncSession, user) -> None:
    quote = await _create_quote(db_session, user, state=QuoteState.draft)
    deps = _make_deps(db_session, user)

    assert SendQuote.is_available(quote, deps) is True
    await SendQuote.execute(quote, EmptyActionData(), db_session, deps)

    assert quote.state == QuoteState.sent
    assert quote.identifier is not None
    assert quote.identifier.startswith("Q")


async def test_accept_from_sent(db_session: AsyncSession, user) -> None:
    quote = await _create_quote(db_session, user, state=QuoteState.sent)
    deps = _make_deps(db_session, user)

    assert AcceptQuote.is_available(quote, deps) is True
    await AcceptQuote.execute(quote, EmptyActionData(), db_session, deps)
    assert quote.state == QuoteState.accepted


async def test_decline_from_sent(db_session: AsyncSession, user) -> None:
    quote = await _create_quote(db_session, user, state=QuoteState.sent)
    deps = _make_deps(db_session, user)

    assert DeclineQuote.is_available(quote, deps) is True
    await DeclineQuote.execute(quote, EmptyActionData(), db_session, deps)
    assert quote.state == QuoteState.declined


async def test_accept_blocked_from_draft(db_session: AsyncSession, user) -> None:
    quote = await _create_quote(db_session, user, state=QuoteState.draft)
    deps = _make_deps(db_session, user)

    assert AcceptQuote.is_available(quote, deps) is False
    with pytest.raises(InvalidTransitionError):
        await deps.sm_service.transition(quote_state_machine, quote, QuoteState.accepted, actor=user)


async def test_line_item_math_recalculates_total(db_session: AsyncSession, user) -> None:
    quote = await _create_quote(db_session, user)
    deps = _make_deps(db_session, user)

    add_response = await AddLineItem.execute(
        AddLineItemData(
            quote_id=quote.id, description="Hull inspection", quantity=Decimal("2.00"), unit_price_cents=15000
        ),
        db_session,
        deps,
    )
    await AddLineItem.execute(
        AddLineItemData(
            quote_id=quote.id, description="Engine survey", quantity=Decimal("1.00"), unit_price_cents=25000
        ),
        db_session,
        deps,
    )

    assert quote.total_cents == 55000

    item = (
        await db_session.execute(select(QuoteLineItem).where(QuoteLineItem.id == add_response.created_id))
    ).scalar_one()
    await UpdateLineItem.execute(
        item,
        UpdateLineItemData(
            description="Hull inspection", quantity=Decimal("3.00"), unit_price_cents=15000, sort_order=0
        ),
        db_session,
        deps,
    )

    assert quote.total_cents == 70000

    await RemoveLineItem.execute(item, EmptyActionData(), db_session, deps)

    assert quote.total_cents == 25000


async def test_add_line_item_blocked_when_not_draft(db_session: AsyncSession, user) -> None:
    quote = await _create_quote(db_session, user, state=QuoteState.sent)
    deps = _make_deps(db_session, user)

    response = await AddLineItem.execute(
        AddLineItemData(quote_id=quote.id, description="Late add", quantity=Decimal("1.00"), unit_price_cents=1000),
        db_session,
        deps,
    )

    assert response.created_id is None
    items = (await db_session.execute(select(QuoteLineItem).where(QuoteLineItem.quote_id == quote.id))).scalars().all()
    assert len(items) == 0
