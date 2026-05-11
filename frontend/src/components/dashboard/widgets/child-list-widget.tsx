import { useSuspenseQuery } from "@tanstack/react-query";
import { listInvoice } from "@/openapi/invoice/invoice";
import { listSurvey } from "@/openapi/survey/survey";
import { listVessel } from "@/openapi/vessel/vessel";
import { listReport } from "@/openapi/report/report";
import { listClient } from "@/openapi/client/client";
import type { ListRequest } from "@/openapi/litestarAPI.schemas";
import type { ChildListWidgetConfig, FilterDefinition, ResourceType } from "../types";

const LIST_MAP: Record<ResourceType, (r: ListRequest) => Promise<{ items: Record<string, unknown>[]; total: number }>> = {
  invoices: listInvoice as never,
  surveys: listSurvey as never,
  vessels: listVessel as never,
  reports: listReport as never,
  clients: listClient as never,
};

const LABEL_FIELD: Record<ResourceType, string> = {
  invoices: "invoice_number",
  surveys: "title",
  vessels: "name",
  reports: "title",
  clients: "display_name",
};

const SUB_FIELD: Record<ResourceType, string> = {
  invoices: "state",
  surveys: "state",
  vessels: "hin",
  reports: "state",
  clients: "client_type",
};

function buildRequest(filters: FilterDefinition[] | undefined, limit: number): ListRequest {
  return {
    filters: (filters as ListRequest["filters"]) ?? [],
    sorts: [{ column: "created_at", direction: "desc" }],
    limit,
    offset: 0,
  };
}

export function ChildListWidget({ config }: { config: ChildListWidgetConfig }) {
  const limit = config.limit ?? 10;
  const request = buildRequest(config.filters, limit);
  const { data } = useSuspenseQuery({
    queryKey: ["resource-list", config.resource, config.filters, limit],
    queryFn: () => LIST_MAP[config.resource](request),
  });

  const items = data.items ?? [];
  const labelField = LABEL_FIELD[config.resource];
  const subField = SUB_FIELD[config.resource];

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border px-6 pb-3 pt-4">
        <h3 className="font-display text-base font-bold text-foreground">{config.title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">No items</p>
      ) : (
        <div className="divide-y divide-border/50">
          {items.map((item, i) => (
            <div key={String(item.id ?? i)} className="flex items-center justify-between px-5 py-3">
              <p className="text-sm font-medium truncate">{String(item[labelField] ?? "—")}</p>
              {item[subField] && (
                <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                  {String(item[subField])}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
