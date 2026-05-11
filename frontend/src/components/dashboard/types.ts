import type { Granularity, TimeRange, WidgetType } from "@/openapi/litestarAPI.schemas";

export type { Granularity, TimeRange, WidgetType };

export type ResourceType =
  | "invoices"
  | "surveys"
  | "vessels"
  | "reports"
  | "clients";

export interface FilterDefinition {
  column: string;
  operator: string;
  value: unknown;
}

interface BaseWidget {
  id: string;
  cols: 1 | 2 | 3 | 4;
}

export interface StatCardsWidgetConfig extends BaseWidget {
  type: "stat_cards";
  stats: Array<{
    resource: ResourceType;
    field: string;
    aggregation?: string;
    time_range?: TimeRange;
    filters?: FilterDefinition[];
    label: string;
    color: "blue" | "green" | "red" | "yellow";
    href?: string;
  }>;
}

export interface AreaChartWidgetConfig extends BaseWidget {
  type: "area_chart";
  title: string;
  resource: ResourceType;
  field: string;
  time_range?: TimeRange;
  granularity?: Granularity;
  filters?: FilterDefinition[];
}

export interface BarChartWidgetConfig extends BaseWidget {
  type: "bar_chart";
  title: string;
  resource: ResourceType;
  field: string;
  time_range?: TimeRange;
  filters?: FilterDefinition[];
}

export interface ResourceTableWidgetConfig extends BaseWidget {
  type: "resource_table";
  title: string;
  resource: ResourceType;
  filters?: FilterDefinition[];
  columns: string[];
  limit?: number;
}

export interface ChildListWidgetConfig extends BaseWidget {
  type: "child_list";
  title: string;
  resource: ResourceType;
  filters?: FilterDefinition[];
  limit?: number;
}

export type WidgetConfig =
  | StatCardsWidgetConfig
  | AreaChartWidgetConfig
  | BarChartWidgetConfig
  | ResourceTableWidgetConfig
  | ChildListWidgetConfig;

export interface DashboardConfig {
  widgets: WidgetConfig[];
}
