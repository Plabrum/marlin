import { MetricAreaChart } from "@/components/data-display/metric-area-chart";
import type { NumericalTimeSeriesData } from "@/openapi/litestarAPI.schemas";
import type { AreaChartWidgetConfig } from "../types";
import { useResourceData } from "./use-resource-data";

function formatTimestamp(ts: string, granularity: string): string {
  const d = new Date(ts);
  if (granularity === "YEAR") return String(d.getUTCFullYear());
  if (granularity === "MONTH" || granularity === "QUARTER")
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function AreaChartWidget({ config }: { config: AreaChartWidgetConfig }) {
  const { data: response } = useResourceData(
    config.resource,
    config.field,
    config.time_range,
    config.granularity,
    config.filters,
  );

  const numericalData = response.data as NumericalTimeSeriesData;
  const granularity = response.granularity_used ?? "DAY";
  const chartData = (numericalData.points ?? []).map((p) => ({
    label: formatTimestamp(p.timestamp, granularity),
    value: p.value ?? 0,
  }));

  return (
    <MetricAreaChart
      title={config.title}
      data={chartData}
      series={[{ key: "value", label: config.field }]}
    />
  );
}
