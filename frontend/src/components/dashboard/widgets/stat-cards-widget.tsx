import { Suspense } from "react";
import { StatCard } from "@/components/data-display/stat-card";
import type { NumericalTimeSeriesData } from "@/openapi/litestarAPI.schemas";
import type { StatCardsWidgetConfig } from "../types";
import { useTimeSeriesData } from "../data-sources";

type StatConfig = StatCardsWidgetConfig["stats"][number];

function StatCardItem({ stat }: { stat: StatConfig }) {
  const { data: response } = useTimeSeriesData({
    resource: stat.resource,
    field: stat.field,
    time_range: stat.time_range,
    granularity: "auto",
    filters: stat.filters,
    aggregation: stat.aggregation,
  });

  const points = (response.data as NumericalTimeSeriesData)?.points ?? [];
  const lastPoint = points[points.length - 1];
  const raw = lastPoint?.value ?? response.total_records;
  const value = Math.round(raw).toLocaleString();

  return (
    <StatCard
      label={stat.label}
      value={value}
      color={stat.color}
      href={stat.href}
    />
  );
}

function StatCardSkeleton() {
  return <div className="h-[92px] animate-pulse rounded-2xl bg-muted" />;
}

export function StatCardsWidget({ config }: { config: StatCardsWidgetConfig }) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
    >
      {config.stats.map((stat, i) => (
        <Suspense key={`${stat.label}-${i}`} fallback={<StatCardSkeleton />}>
          <StatCardItem stat={stat} />
        </Suspense>
      ))}
    </div>
  );
}
