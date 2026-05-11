from datetime import datetime

from app.platform.base.schemas import BaseSchema
from app.platform.dashboard.enums import WidgetType
from app.utils.sqids import Sqid


class DashboardRead(BaseSchema):
    id: Sqid
    config: dict
    widget_types: list[WidgetType]
    updated_at: datetime


class DashboardUpdate(BaseSchema):
    config: dict
