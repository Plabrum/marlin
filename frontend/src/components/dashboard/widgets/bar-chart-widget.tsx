import { MetricBarChart } from "@/components/data-display/metric-bar-chart";
import type { NumericalTimeSeriesData } from "@/openapi/litestarAPI.schemas";
import type { BarChartWidgetConfig } from "../types";
import { useTimeSeriesData } from "../data-sources";

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function BarChartWidget({ config }: { config: BarChartWidgetConfig }) {
  const { data: response } = useTimeSeriesData({
    resource: config.resource,
    field: config.field,
    time_range: config.time_range,
    filters: config.filters,
  });

  const numericalData = response.data as NumericalTimeSeriesData;
  const bars = (numericalData.points ?? []).map((p) => ({
    label: formatTimestamp(p.timestamp),
    value: p.value ?? 0,
  }));

  return <MetricBarChart title={config.title} bars={bars} />;
}
