from __future__ import annotations

from litestar import Router, get, patch
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.models import User
from app.platform.auth.guards import requires_session
from app.platform.dashboard.enums import WidgetType
from app.platform.dashboard.models import Dashboard
from app.platform.dashboard.schemas import DashboardRead, DashboardUpdate

_ALL_WIDGET_TYPES = list(WidgetType)


def _to_read(dashboard: Dashboard) -> DashboardRead:
    return DashboardRead(
        id=dashboard.id,
        config=dashboard.config,
        widget_types=_ALL_WIDGET_TYPES,
        updated_at=dashboard.updated_at,
    )


@get("/", guards=[requires_session], tags=["dashboard"], operation_id="get_dashboard")
async def get_dashboard_handler(user: User, transaction: AsyncSession) -> DashboardRead:
    result = await transaction.execute(select(Dashboard).where(Dashboard.user_id == user.id))
    dashboard = result.scalar_one_or_none()
    if dashboard is None:
        dashboard = Dashboard(user_id=user.id, config={"widgets": []})
        transaction.add(dashboard)
        await transaction.flush()
    return _to_read(dashboard)


@patch("/", guards=[requires_session], tags=["dashboard"], operation_id="update_dashboard")
async def update_dashboard_handler(
    data: DashboardUpdate,
    user: User,
    transaction: AsyncSession,
) -> DashboardRead:
    result = await transaction.execute(select(Dashboard).where(Dashboard.user_id == user.id))
    dashboard = result.scalar_one_or_none()
    if dashboard is None:
        dashboard = Dashboard(user_id=user.id, config=data.config)
        transaction.add(dashboard)
    else:
        dashboard.config = data.config
    await transaction.flush()
    return _to_read(dashboard)


dashboard_router = Router(path="/dashboard", route_handlers=[get_dashboard_handler, update_dashboard_handler])
