"""LLM tool for updating the user's dashboard configuration."""

from __future__ import annotations

from typing import Any

import msgspec
from msgspec import Struct
from sqlalchemy import select

from app.platform.dashboard.enums import WidgetType
from app.platform.dashboard.models import Dashboard
from app.platform.llm.registry import SloopTool, ToolContext, ToolResult, register_tool
from app.platform.llm.schemas import InputSchema, PropertySchema

_WIDGET_TYPES_STR = ", ".join(list(WidgetType))


class UpdateDashboardInput(Struct):
    config: str  # JSON-encoded DashboardConfig blob


@register_tool
class UpdateDashboardTool(SloopTool):
    name = "update_dashboard"
    description = (
        "Replace the user's dashboard configuration with a new JSONB config blob. "
        "The config must be a JSON object with a `widgets` array. "
        f"Each widget must have `id` (stable uuid), `type` (one of: {_WIDGET_TYPES_STR}), "
        "and `cols` (1–4). "
        "Widget types and their required fields:\n"
        "- area_chart: title, resource, field, time_range?, granularity?, filters?\n"
        "- bar_chart: title, resource, field, time_range?, filters?\n"
        "- stat_cards: stats[] (each: resource, field, label, color, time_range?, filters?, href?)\n"
        "- resource_table: title, resource, columns[], filters?, limit?\n"
        "- child_list: title, resource, filters?, limit?\n"
        "Valid resources: invoices, surveys, vessels, reports, clients. "
        "Valid time_range values (lowercase): last_7_days, last_30_days, last_90_days, last_6_months, "
        "last_year, year_to_date, month_to_date, all_time. "
        "Valid granularity values (lowercase): auto, day, week, month, quarter, year. "
        "Returns a summary of the updated dashboard."
    )
    input_schema = InputSchema(
        properties={
            "config": PropertySchema(
                type="string",
                description='JSON-encoded dashboard config, e.g. {"widgets": [...]}',
            ),
        },
        required=["config"],
    )
    input_struct = UpdateDashboardInput

    async def execute(self, ctx: ToolContext, args: UpdateDashboardInput) -> ToolResult | str:
        try:
            config_dict: dict[str, Any] = msgspec.json.decode(args.config.encode())
        except (msgspec.DecodeError, ValueError) as exc:
            return f"Invalid JSON: {exc}"

        widgets = config_dict.get("widgets")
        if not isinstance(widgets, list):
            return "config must have a `widgets` array"

        valid_types = set(WidgetType)
        for w in widgets:
            if not isinstance(w, dict):
                return "Each widget must be a JSON object"
            widget_type = w.get("type")
            if widget_type not in valid_types:
                return f"Invalid widget type {widget_type!r}. Must be one of: {_WIDGET_TYPES_STR}"

        result = await ctx.db.execute(select(Dashboard).where(Dashboard.user_id == ctx.user.id))
        dashboard = result.scalar_one_or_none()
        if dashboard is None:
            dashboard = Dashboard(user_id=ctx.user.id, config=config_dict)
            ctx.db.add(dashboard)
        else:
            dashboard.config = config_dict
        await ctx.db.flush()

        ctx.invalidate_keys.append("/dashboard")

        widget_summary = ", ".join(f"{w.get('type')} (cols={w.get('cols')})" for w in widgets)
        return ToolResult(
            message=f"Dashboard updated with {len(widgets)} widget(s): {widget_summary}"
            if widgets
            else "Dashboard cleared (no widgets)",
        )
