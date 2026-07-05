from __future__ import annotations

from decimal import Decimal

from litestar.exceptions import NotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.pricing_guides.enums import PricingType, ServiceType
from app.domain.pricing_guides.models import PricingGuide, PricingTier
from app.domain.quotes.models import Quote, QuoteLineItem
from app.domain.vessels.models import Vessel
from app.utils.sqids import Sqid


async def recalculate_totals(quote: Quote, transaction: AsyncSession) -> None:
    result = await transaction.execute(select(QuoteLineItem).where(QuoteLineItem.quote_id == quote.id))
    items = result.scalars().all()
    total = sum(round(item.quantity * item.unit_price_cents) for item in items)
    quote.total_cents = int(total)


def _select_tier(tiers: list[PricingTier], loa_ft: Decimal | None) -> PricingTier | None:
    """Tiers are pre-sorted ascending by length_until_ft, catchall (None) last."""
    if not tiers:
        return None
    for tier in tiers:
        if tier.length_until_ft is None or (loa_ft is not None and loa_ft <= tier.length_until_ft):
            return tier
    return None


async def generate_quote_for_survey(
    transaction: AsyncSession,
    *,
    organization_id: int,
    survey_id: Sqid,
    vessel_id: Sqid,
    assigned_surveyor_id: Sqid,
    client_id: Sqid,
    service_type: ServiceType,
    notes: str | None = None,
) -> Quote:
    """Create a Quote for a survey, auto-pricing a single line item from the
    assigned surveyor's active pricing guide for `service_type`, tiered by the
    vessel's length overall (loa_ft).

    Falls back to a $0 quote (for staff to price manually) when no guide is
    configured, no tier matches, or the matched tier is `by_quote`.
    """
    vessel = await transaction.get(Vessel, vessel_id)
    if vessel is None:
        raise NotFoundException("Vessel not found")

    quote = Quote(
        organization_id=organization_id,
        survey_id=survey_id,
        client_id=client_id,
        notes=notes,
    )
    transaction.add(quote)
    await transaction.flush()

    guide = (
        await transaction.execute(
            select(PricingGuide).where(
                PricingGuide.user_id == assigned_surveyor_id,
                PricingGuide.service_type == service_type,
                PricingGuide.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if guide is None:
        return quote

    quote.pricing_guide_id = guide.id
    tiers = (
        (
            await transaction.execute(
                select(PricingTier)
                .where(PricingTier.guide_id == guide.id)
                .order_by(PricingTier.length_until_ft.asc().nulls_last())
            )
        )
        .scalars()
        .all()
    )
    tier = _select_tier(list(tiers), vessel.loa_ft)
    if tier is None or tier.pricing_type == PricingType.by_quote or tier.amount_cents is None:
        return quote

    if tier.pricing_type == PricingType.flat:
        quantity, unit_price_cents = Decimal("1"), tier.amount_cents
    else:
        quantity, unit_price_cents = (vessel.loa_ft or Decimal("0")), tier.amount_cents

    service_label = service_type.value.replace("_", " ").title()
    line_item = QuoteLineItem(
        organization_id=organization_id,
        quote_id=quote.id,
        description=f"{service_label} survey — {vessel.name}",
        quantity=quantity,
        unit_price_cents=unit_price_cents,
        sort_order=0,
    )
    transaction.add(line_item)
    await transaction.flush()
    await recalculate_totals(quote, transaction)
    return quote
