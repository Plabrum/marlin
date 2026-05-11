from datetime import datetime

from app.platform.base.filters import FilterDefinition
from app.platform.base.schemas import BaseSchema
from app.platform.dashboard.enums import ResourceType, WidgetColor, WidgetType
from app.platform.data.enums import AggregationType, Granularity, TimeRange
from app.utils.sqids import Sqid


class WidgetQuery(BaseSchema):
    """Typed query payload for any widget.

    Different widget types use different subsets — chart widgets use
    field/aggregation/time_range/granularity, list widgets use columns/limit,
    stat numbers use field/aggregation/time_range + color/href.
    """

    resource: ResourceType
    field: str | None = None
    aggregation: AggregationType | None = None
    time_range: TimeRange | None = None
    granularity: Granularity | None = None
    filters: list[FilterDefinition] = []
    columns: list[str] = []
    limit: int | None = None
    color: WidgetColor | None = None
    href: str | None = None


class WidgetRead(BaseSchema):
    id: Sqid
    dashboard_id: Sqid
    type: WidgetType
    title: str
    description: str | None
    query: WidgetQuery
    position_x: int
    position_y: int
    size_w: int
    size_h: int
    created_at: datetime
    updated_at: datetime


class CreateWidgetData(BaseSchema):
    dashboard_id: Sqid
    type: WidgetType
    title: str
    query: WidgetQuery
    description: str | None = None
    position_x: int = 0
    position_y: int = 0
    size_w: int = 1
    size_h: int = 1


class UpdateWidgetData(BaseSchema):
    type: WidgetType
    title: str
    query: WidgetQuery
    description: str | None = None
    position_x: int = 0
    position_y: int = 0
    size_w: int = 1
    size_h: int = 1


class DashboardRead(BaseSchema):
    id: Sqid
    widgets: list[WidgetRead]
    widget_types: list[WidgetType]
    updated_at: datetime
