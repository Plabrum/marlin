import { useSuspenseQuery } from "@tanstack/react-query";
import { listInvoice } from "@/openapi/invoice/invoice";
import { listSurvey } from "@/openapi/survey/survey";
import { listVessel } from "@/openapi/vessel/vessel";
import { listReport } from "@/openapi/report/report";
import { listClient } from "@/openapi/client/client";
import type { ListRequest } from "@/openapi/litestarAPI.schemas";
import type { FilterDefinition, ResourceType, ResourceTableWidgetConfig } from "../types";

const LIST_MAP: Record<ResourceType, (r: ListRequest) => Promise<{ items: Record<string, unknown>[]; total: number }>> = {
  invoices: listInvoice as never,
  surveys: listSurvey as never,
  vessels: listVessel as never,
  reports: listReport as never,
  clients: listClient as never,
};

function buildRequest(filters: FilterDefinition[] | undefined, limit: number): ListRequest {
  return {
    filters: (filters as ListRequest["filters"]) ?? [],
    sorts: [{ column: "created_at", direction: "desc" }],
    limit,
    offset: 0,
  };
}

export function ResourceTableWidget({ config }: { config: ResourceTableWidgetConfig }) {
  const limit = config.limit ?? 10;
  const request = buildRequest(config.filters, limit);
  const { data } = useSuspenseQuery({
    queryKey: ["resource-list", config.resource, config.filters, limit],
    queryFn: () => LIST_MAP[config.resource](request),
  });

  const items = data.items ?? [];
  const cols = config.columns;

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border px-6 pb-3 pt-4">
        <h3 className="font-display text-base font-bold text-foreground">{config.title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">No data</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {cols.map((col) => (
                  <th key={col} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {col.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={String(item.id ?? i)} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  {cols.map((col) => (
                    <td key={col} className="px-4 py-2 text-xs text-foreground">
                      {String(item[col] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
