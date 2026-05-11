import { useQueries } from "@tanstack/react-query";
import { StatCards } from "@/components/data-display/stat-card";
import { dataInvoice } from "@/openapi/invoices/invoices";
import { dataSurvey } from "@/openapi/surveys/surveys";
import { dataVessel } from "@/openapi/vessels/vessels";
import { dataReport } from "@/openapi/reports/reports";
import type { NumericalTimeSeriesData, TimeSeriesDataRequest, TimeSeriesDataResponse } from "@/openapi/litestarAPI.schemas";
import type { ResourceType, StatCardsWidgetConfig } from "../types";

const FETCHER_MAP: Record<ResourceType, ((r: TimeSeriesDataRequest) => Promise<TimeSeriesDataResponse>) | null> = {
  invoices: dataInvoice,
  surveys: dataSurvey,
  vessels: dataVessel,
  reports: dataReport,
  clients: null,
};

export function StatCardsWidget({ config }: { config: StatCardsWidgetConfig }) {
  const results = useQueries({
    queries: config.stats.map((stat) => {
      const fetcher = FETCHER_MAP[stat.resource];
      const request: TimeSeriesDataRequest = {
        field: stat.field,
        ...(stat.time_range && { time_range: stat.time_range }),
        granularity: "auto",
        filters: (stat.filters as TimeSeriesDataRequest["filters"]) ?? [],
        ...(stat.aggregation && { aggregation: stat.aggregation as TimeSeriesDataRequest["aggregation"] }),
      };
      return {
        queryKey: ["resource-data", stat.resource, stat.field, stat.time_range, stat.aggregation],
        queryFn: (): Promise<TimeSeriesDataResponse> => {
          if (!fetcher) return Promise.reject(new Error(`No data endpoint for: ${stat.resource}`));
          return fetcher(request);
        },
        retry: false,
      };
    }),
  });

  const stats = config.stats.map((stat, i) => {
    const result = results[i];
    let value: string = "—";
    if (result.isSuccess && result.data) {
      const response = result.data;
      const points = (response.data as NumericalTimeSeriesData)?.points ?? [];
      const total = response.total_records;
      const lastPoint = points[points.length - 1];
      const raw = lastPoint?.value ?? total;
      value = Math.round(raw).toLocaleString();
    }

    return {
      label: stat.label,
      value,
      color: stat.color,
      href: stat.href,
    };
  });

  return <StatCards stats={stats} />;
}
