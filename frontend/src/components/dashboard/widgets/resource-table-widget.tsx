import { useResourceList } from '../data-sources';
import type { WidgetRead } from '../types';

export function ResourceTableWidget({ widget }: { widget: WidgetRead }) {
  const { data } = useResourceList(
    widget.query.resource,
    widget.query.filters,
    widget.query.limit ?? 10
  );

  const items = data.items ?? [];
  const cols = widget.query.columns ?? [];

  return (
    <div className="border-border bg-card overflow-hidden rounded-[var(--radius-lg)] border">
      <div className="px-5 pt-4 pb-2">
        <h3 className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          {widget.title}
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground px-5 py-8 text-center text-sm">
          No data
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-y">
                {cols.map((col) => (
                  <th
                    key={col}
                    className="text-muted-foreground px-4 py-2 text-left text-[11px] font-medium tracking-wide uppercase"
                  >
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={String(item.id ?? i)}
                  className="border-border/40 hover:bg-muted/30 border-b transition-colors last:border-0"
                >
                  {cols.map((col) => (
                    <td
                      key={col}
                      className="text-foreground px-4 py-2 text-xs tabular-nums"
                    >
                      {String(item[col] ?? '')}
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
