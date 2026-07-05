"""Tests for auto-pricing quote generation from a survey."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.pricing_guides.enums import PricingType, ServiceType
from app.domain.quotes.models import QuoteLineItem
from app.domain.quotes.service import generate_quote_for_survey
from app.domain.surveys.enums import SurveyState
from app.utils.sqids import Sqid
from tests.factories.clients import ClientFactory
from tests.factories.pricing_guides import PricingGuideFactory, PricingTierFactory
from tests.factories.surveys import SurveyFactory
from tests.factories.vessels import VesselFactory


async def _make_common(db_session: AsyncSession, user, loa_ft: Decimal | None) -> tuple[Sqid, Sqid, Sqid]:
    vessel = await VesselFactory.create_async(session=db_session, organization_id=user.organization_id, loa_ft=loa_ft)
    survey = await SurveyFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        vessel_id=vessel.id,
        assigned_surveyor_id=user.id,
        state=SurveyState.quote,
    )
    client = await ClientFactory.create_async(session=db_session, organization_id=user.organization_id)
    await db_session.flush()
    return survey.id, vessel.id, client.id


async def test_no_guide_configured_yields_zero_total(db_session: AsyncSession, user) -> None:
    survey_id, vessel_id, client_id = await _make_common(db_session, user, Decimal("35.00"))

    quote = await generate_quote_for_survey(
        db_session,
        organization_id=user.organization_id,
        survey_id=survey_id,
        vessel_id=vessel_id,
        assigned_surveyor_id=user.id,
        client_id=client_id,
        service_type=ServiceType.pre_purchase,
    )

    assert quote.total_cents == 0
    assert quote.pricing_guide_id is None


async def test_flat_tier_prices_regardless_of_length(db_session: AsyncSession, user) -> None:
    survey_id, vessel_id, client_id = await _make_common(db_session, user, Decimal("40.00"))
    guide = await PricingGuideFactory.create_async(
        session=db_session, organization_id=user.organization_id, user_id=user.id, service_type=ServiceType.sea_trial
    )
    await PricingTierFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        guide_id=guide.id,
        length_until_ft=None,
        pricing_type=PricingType.flat,
        amount_cents=50000,
    )
    await db_session.flush()

    quote = await generate_quote_for_survey(
        db_session,
        organization_id=user.organization_id,
        survey_id=survey_id,
        vessel_id=vessel_id,
        assigned_surveyor_id=user.id,
        client_id=client_id,
        service_type=ServiceType.sea_trial,
    )

    assert quote.pricing_guide_id == guide.id
    assert quote.total_cents == 50000
    line_items = (
        (await db_session.execute(select(QuoteLineItem).where(QuoteLineItem.quote_id == quote.id))).scalars().all()
    )
    assert len(line_items) == 1
    assert line_items[0].quantity == Decimal("1")
    assert line_items[0].unit_price_cents == 50000


async def test_per_foot_tier_multiplies_by_length(db_session: AsyncSession, user) -> None:
    survey_id, vessel_id, client_id = await _make_common(db_session, user, Decimal("30.00"))
    guide = await PricingGuideFactory.create_async(
        session=db_session, organization_id=user.organization_id, user_id=user.id, service_type=ServiceType.insurance
    )
    await PricingTierFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        guide_id=guide.id,
        length_until_ft=None,
        pricing_type=PricingType.per_foot,
        amount_cents=2000,
    )
    await db_session.flush()

    quote = await generate_quote_for_survey(
        db_session,
        organization_id=user.organization_id,
        survey_id=survey_id,
        vessel_id=vessel_id,
        assigned_surveyor_id=user.id,
        client_id=client_id,
        service_type=ServiceType.insurance,
    )

    assert quote.total_cents == 60000


async def test_selects_smallest_matching_length_tier(db_session: AsyncSession, user) -> None:
    survey_id, vessel_id, client_id = await _make_common(db_session, user, Decimal("28.00"))
    guide = await PricingGuideFactory.create_async(
        session=db_session, organization_id=user.organization_id, user_id=user.id, service_type=ServiceType.damage
    )
    await PricingTierFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        guide_id=guide.id,
        length_until_ft=Decimal("30.00"),
        pricing_type=PricingType.flat,
        amount_cents=40000,
    )
    await PricingTierFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        guide_id=guide.id,
        length_until_ft=Decimal("50.00"),
        pricing_type=PricingType.flat,
        amount_cents=70000,
    )
    await db_session.flush()

    quote = await generate_quote_for_survey(
        db_session,
        organization_id=user.organization_id,
        survey_id=survey_id,
        vessel_id=vessel_id,
        assigned_surveyor_id=user.id,
        client_id=client_id,
        service_type=ServiceType.damage,
    )

    assert quote.total_cents == 40000


async def test_by_quote_tier_yields_zero_total_but_links_guide(db_session: AsyncSession, user) -> None:
    survey_id, vessel_id, client_id = await _make_common(db_session, user, Decimal("60.00"))
    guide = await PricingGuideFactory.create_async(
        session=db_session, organization_id=user.organization_id, user_id=user.id, service_type=ServiceType.delivery
    )
    await PricingTierFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        guide_id=guide.id,
        length_until_ft=None,
        pricing_type=PricingType.by_quote,
        amount_cents=None,
    )
    await db_session.flush()

    quote = await generate_quote_for_survey(
        db_session,
        organization_id=user.organization_id,
        survey_id=survey_id,
        vessel_id=vessel_id,
        assigned_surveyor_id=user.id,
        client_id=client_id,
        service_type=ServiceType.delivery,
    )

    assert quote.pricing_guide_id == guide.id
    assert quote.total_cents == 0
    line_items = (
        (await db_session.execute(select(QuoteLineItem).where(QuoteLineItem.quote_id == quote.id))).scalars().all()
    )
    assert len(line_items) == 0


async def test_wrong_service_type_guide_is_ignored(db_session: AsyncSession, user) -> None:
    survey_id, vessel_id, client_id = await _make_common(db_session, user, Decimal("35.00"))
    guide = await PricingGuideFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        user_id=user.id,
        service_type=ServiceType.consultation,
    )
    await PricingTierFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        guide_id=guide.id,
        length_until_ft=None,
        pricing_type=PricingType.flat,
        amount_cents=99999,
    )
    await db_session.flush()

    quote = await generate_quote_for_survey(
        db_session,
        organization_id=user.organization_id,
        survey_id=survey_id,
        vessel_id=vessel_id,
        assigned_surveyor_id=user.id,
        client_id=client_id,
        service_type=ServiceType.pre_purchase,
    )

    assert quote.pricing_guide_id is None
    assert quote.total_cents == 0
