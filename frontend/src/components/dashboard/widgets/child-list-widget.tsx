import type { ChildListWidgetConfig } from "../types";
import { getResourceMeta, useResourceList } from "../data-sources";

export function ChildListWidget({ config }: { config: ChildListWidgetConfig }) {
  const { data } = useResourceList({
    resource: config.resource,
    filters: config.filters,
    limit: config.limit ?? 10,
  });

  const items = data.items ?? [];
  const { labelField, subField } = getResourceMeta(config.resource);

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
