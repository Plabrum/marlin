import type { ResourceTableWidgetConfig } from "../types";
import { useResourceList } from "../data-sources";

export function ResourceTableWidget({ config }: { config: ResourceTableWidgetConfig }) {
  const { data } = useResourceList({
    resource: config.resource,
    filters: config.filters,
    limit: config.limit ?? 10,
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
