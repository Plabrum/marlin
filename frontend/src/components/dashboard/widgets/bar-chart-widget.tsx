import { MetricBarChart } from "@/components/data-display/metric-bar-chart";
import type { NumericalTimeSeriesData } from "@/openapi/litestarAPI.schemas";
import type { BarChartWidgetConfig } from "../types";
import { useResourceData } from "./use-resource-data";

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function BarChartWidget({ config }: { config: BarChartWidgetConfig }) {
  const { data: response } = useResourceData(
    config.resource,
    config.field,
    config.time_range,
    undefined,
    config.filters,
  );

  const numericalData = response.data as NumericalTimeSeriesData;
  const bars = (numericalData.points ?? []).map((p) => ({
    label: formatTimestamp(p.timestamp),
    value: p.value ?? 0,
  }));

  return <MetricBarChart title={config.title} bars={bars} />;
}
