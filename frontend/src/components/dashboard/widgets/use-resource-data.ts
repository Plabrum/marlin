import { useSuspenseQuery } from "@tanstack/react-query";
import { dataInvoice } from "@/openapi/invoices/invoices";
import { dataSurvey } from "@/openapi/surveys/surveys";
import { dataVessel } from "@/openapi/vessels/vessels";
import { dataReport } from "@/openapi/reports/reports";
import type { TimeSeriesDataRequest, TimeSeriesDataResponse } from "@/openapi/litestarAPI.schemas";
import type { FilterDefinition, Granularity, ResourceType, TimeRange } from "../types";

const FETCHER_MAP: Record<ResourceType, ((r: TimeSeriesDataRequest) => Promise<TimeSeriesDataResponse>) | null> = {
  invoices: dataInvoice,
  surveys: dataSurvey,
  vessels: dataVessel,
  reports: dataReport,
  clients: null,
};

export function useResourceData(
  resource: ResourceType,
  field: string,
  timeRange?: TimeRange,
  granularity?: Granularity,
  filters?: FilterDefinition[],
) {
  const fetcher = FETCHER_MAP[resource];

  const request: TimeSeriesDataRequest = {
    field,
    ...(timeRange && { time_range: timeRange }),
    ...(granularity && { granularity }),
    filters: (filters as TimeSeriesDataRequest["filters"]) ?? [],
  };

  return useSuspenseQuery({
    queryKey: ["resource-data", resource, field, timeRange, granularity, filters],
    queryFn: () => {
      if (!fetcher) throw new Error(`No data endpoint for resource: ${resource}`);
      return fetcher(request);
    },
  });
}
