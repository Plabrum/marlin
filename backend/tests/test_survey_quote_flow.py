"""Tests for the survey <-> quote lifecycle coupling: creating a survey directly
in `quote` state, generating a quote from an existing survey, and quote
acceptance auto-advancing the survey to `scheduled`.
"""

from __future__ import annotations

from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from litestar.exceptions import ValidationException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.pricing_guides.enums import PricingType, ServiceType
from app.domain.quotes.actions import AcceptQuote, DeclineQuote
from app.domain.quotes.enums import QuoteState
from app.domain.quotes.models import Quote
from app.domain.surveys.actions import CreateSurvey, GenerateQuote
from app.domain.surveys.enums import SurveyState
from app.domain.surveys.models import Survey
from app.domain.surveys.schemas import CreateSurveyData, GenerateQuoteData
from app.platform.actions.base import EmptyActionData
from app.platform.actions.deps import ActionDeps
from app.platform.state_machine.machine import StateMachineService
from tests.factories.clients import ClientFactory
from tests.factories.pricing_guides import PricingGuideFactory, PricingTierFactory
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
        s3=MagicMock(),
    )


async def test_create_survey_defaults_to_scheduled(db_session: AsyncSession, user) -> None:
    vessel = await VesselFactory.create_async(session=db_session, organization_id=user.organization_id)
    await db_session.flush()
    deps = _make_deps(db_session, user)
    data = CreateSurveyData(vessel_id=vessel.id, assigned_surveyor_id=user.id)

    response = await CreateSurvey.execute(data, db_session, deps)

    survey = (await db_session.execute(select(Survey).where(Survey.id == response.created_id))).scalar_one()
    assert survey.state == SurveyState.scheduled


async def test_create_survey_requires_client_and_service_type_for_quote(db_session: AsyncSession, user) -> None:
    vessel = await VesselFactory.create_async(session=db_session, organization_id=user.organization_id)
    await db_session.flush()
    deps = _make_deps(db_session, user)
    data = CreateSurveyData(vessel_id=vessel.id, assigned_surveyor_id=user.id, start_as_quote=True)

    with pytest.raises(ValidationException):
        await CreateSurvey.execute(data, db_session, deps)


async def test_create_survey_as_quote_generates_priced_quote(db_session: AsyncSession, user) -> None:
    vessel = await VesselFactory.create_async(
        session=db_session, organization_id=user.organization_id, loa_ft=Decimal("32.00")
    )
    client = await ClientFactory.create_async(session=db_session, organization_id=user.organization_id)
    guide = await PricingGuideFactory.create_async(
        session=db_session, organization_id=user.organization_id, user_id=user.id, service_type=ServiceType.pre_purchase
    )
    await PricingTierFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        guide_id=guide.id,
        length_until_ft=None,
        pricing_type=PricingType.per_foot,
        amount_cents=1500,
    )
    await db_session.flush()
    deps = _make_deps(db_session, user)
    data = CreateSurveyData(
        vessel_id=vessel.id,
        assigned_surveyor_id=user.id,
        start_as_quote=True,
        client_id=client.id,
        service_type=ServiceType.pre_purchase,
    )

    response = await CreateSurvey.execute(data, db_session, deps)

    survey = (await db_session.execute(select(Survey).where(Survey.id == response.created_id))).scalar_one()
    assert survey.state == SurveyState.quote

    quote = (await db_session.execute(select(Quote).where(Quote.survey_id == survey.id))).scalar_one()
    assert quote.client_id == client.id
    assert quote.total_cents == 48000


async def test_generate_quote_action_on_existing_survey(db_session: AsyncSession, user) -> None:
    vessel = await VesselFactory.create_async(session=db_session, organization_id=user.organization_id)
    survey = await SurveyFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        vessel_id=vessel.id,
        assigned_surveyor_id=user.id,
        state=SurveyState.scheduled,
    )
    client = await ClientFactory.create_async(session=db_session, organization_id=user.organization_id)
    await db_session.flush()
    deps = _make_deps(db_session, user)

    assert GenerateQuote.is_available(survey, deps) is True
    response = await GenerateQuote.execute(
        survey, GenerateQuoteData(client_id=client.id, service_type=ServiceType.consultation), db_session, deps
    )

    quote = (await db_session.execute(select(Quote).where(Quote.id == response.created_id))).scalar_one()
    assert quote.survey_id == survey.id
    assert quote.client_id == client.id


async def test_generate_quote_unavailable_when_cancelled(db_session: AsyncSession, user) -> None:
    vessel = await VesselFactory.create_async(session=db_session, organization_id=user.organization_id)
    survey = await SurveyFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        vessel_id=vessel.id,
        assigned_surveyor_id=user.id,
        state=SurveyState.cancelled,
    )
    await db_session.flush()
    deps = _make_deps(db_session, user)

    assert GenerateQuote.is_available(survey, deps) is False


async def test_accepting_quote_advances_survey_from_quote_to_scheduled(db_session: AsyncSession, user) -> None:
    vessel = await VesselFactory.create_async(session=db_session, organization_id=user.organization_id)
    survey = await SurveyFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        vessel_id=vessel.id,
        assigned_surveyor_id=user.id,
        state=SurveyState.quote,
    )
    client = await ClientFactory.create_async(session=db_session, organization_id=user.organization_id)
    await db_session.flush()
    quote = Quote(
        organization_id=user.organization_id,
        survey_id=survey.id,
        client_id=client.id,
        pricing_guide_id=None,
        state=QuoteState.sent,
    )
    db_session.add(quote)
    await db_session.flush()
    deps = _make_deps(db_session, user)

    await AcceptQuote.execute(quote, EmptyActionData(), db_session, deps)

    assert quote.state == QuoteState.accepted
    await db_session.refresh(survey)
    assert survey.state == SurveyState.scheduled


async def test_declining_quote_leaves_survey_in_quote_state(db_session: AsyncSession, user) -> None:
    vessel = await VesselFactory.create_async(session=db_session, organization_id=user.organization_id)
    survey = await SurveyFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        vessel_id=vessel.id,
        assigned_surveyor_id=user.id,
        state=SurveyState.quote,
    )
    client = await ClientFactory.create_async(session=db_session, organization_id=user.organization_id)
    await db_session.flush()
    quote = Quote(
        organization_id=user.organization_id,
        survey_id=survey.id,
        client_id=client.id,
        pricing_guide_id=None,
        state=QuoteState.sent,
    )
    db_session.add(quote)
    await db_session.flush()
    deps = _make_deps(db_session, user)

    await DeclineQuote.execute(quote, EmptyActionData(), db_session, deps)

    assert quote.state == QuoteState.declined
    await db_session.refresh(survey)
    assert survey.state == SurveyState.quote
