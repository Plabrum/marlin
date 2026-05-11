import { useSuspenseQuery } from "@tanstack/react-query";
import { customInstance } from "@/openapi/custom-instance";
import type {
  ListRequest,
  TimeSeriesDataRequest,
  TimeSeriesDataResponse,
} from "@/openapi/litestarAPI.schemas";
import type {
  FilterDefinition,
  Granularity,
  ResourceType,
  TimeRange,
} from "./types";

interface ResourceMeta {
  labelField: string;
  subField: string;
}

const RESOURCE_META: Record<ResourceType, ResourceMeta> = {
  invoices: { labelField: "invoice_number", subField: "state" },
  surveys:  { labelField: "title",          subField: "state" },
  vessels:  { labelField: "name",           subField: "hin" },
  reports:  { labelField: "title",          subField: "state" },
  clients:  { labelField: "display_name",   subField: "client_type" },
};

export function getResourceMeta(resource: ResourceType): ResourceMeta {
  return RESOURCE_META[resource];
}

export interface TimeSeriesSpec {
  resource: ResourceType;
  field: string;
  time_range?: TimeRange;
  granularity?: Granularity;
  filters?: FilterDefinition[];
  aggregation?: string;
}

export function useTimeSeriesData(spec: TimeSeriesSpec) {
  return useSuspenseQuery({
    queryKey: [
      "dashboard-data",
      spec.resource,
      spec.field,
      spec.time_range,
      spec.granularity,
      spec.aggregation,
      spec.filters,
    ],
    queryFn: ({ signal }) => {
      const body: TimeSeriesDataRequest = {
        field: spec.field,
        ...(spec.time_range && { time_range: spec.time_range }),
        ...(spec.granularity && { granularity: spec.granularity }),
        filters: (spec.filters as TimeSeriesDataRequest["filters"]) ?? [],
        ...(spec.aggregation && { aggregation: spec.aggregation as TimeSeriesDataRequest["aggregation"] }),
      };
      return customInstance<TimeSeriesDataResponse>({
        url: `/${spec.resource}/data`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: body,
        signal,
      });
    },
  });
}

export interface ResourceListSpec {
  resource: ResourceType;
  filters?: FilterDefinition[];
  limit: number;
}

interface DashboardListResponse {
  items: Record<string, unknown>[];
  total: number;
}

export function useResourceList(spec: ResourceListSpec) {
  return useSuspenseQuery({
    queryKey: ["dashboard-list", spec.resource, spec.filters, spec.limit],
    queryFn: ({ signal }) => {
      const body: ListRequest = {
        filters: (spec.filters as ListRequest["filters"]) ?? [],
        sorts: [{ column: "created_at", direction: "desc" }],
        limit: spec.limit,
        offset: 0,
      };
      return customInstance<DashboardListResponse>({
        url: `/${spec.resource}`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: body,
        signal,
      });
    },
  });
}
