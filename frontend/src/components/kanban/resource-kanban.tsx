import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { StateMachineKanban } from "@/components/kanban/state-machine-kanban";
import { StatusBadge } from "@/components/status-badge";
import { useResourceList } from "@/components/dashboard/data-sources";
import type { FilterDefinition } from "@/components/dashboard/types";
import { useActionsActionGroupObjectIdExecuteObjectAction } from "@/openapi/actions/actions";
import {
  RESOURCE_STATE_MACHINES,
  type StateMachineMeta,
} from "@/openapi/state-machines.gen";
import {
  ActionGroupType,
  type ActionDTO,
  type ColumnRule,
  type ResourceType,
} from "@/openapi/litestarAPI.schemas";

export type ResourceRow = Record<string, unknown> & {
  id: string;
  actions?: ActionDTO[];
};

const DEFAULT_LIMIT = 200;

export interface ResourceKanbanProps {
  resource: ResourceType;
  filters?: FilterDefinition[];
  allowedColumns?: string[] | null;
  columnRules?: Record<string, ColumnRule> | null;
  cardColumns?: string[];
  limit?: number;
}

export function ResourceKanban(props: ResourceKanbanProps) {
  const stateMachine = RESOURCE_STATE_MACHINES[props.resource];
  if (!stateMachine || !stateMachine.actionGroup) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Kanban view not available for {props.resource}
      </div>
    );
  }
  return <ResourceKanbanInner {...props} stateMachine={stateMachine} />;
}

function ResourceKanbanInner({
  resource,
  filters,
  allowedColumns,
  columnRules,
  cardColumns,
  limit,
  stateMachine,
}: ResourceKanbanProps & { stateMachine: StateMachineMeta }) {
  const baseFilters: FilterDefinition[] = filters ?? [];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const execute = useActionsActionGroupObjectIdExecuteObjectAction();

  const visibleStates = useMemo(
    () =>
      allowedColumns && allowedColumns.length > 0
        ? stateMachine.states.filter((s) => allowedColumns.includes(s))
        : stateMachine.states,
    [allowedColumns, stateMachine.states],
  );

  const effectiveFilters = useMemo<FilterDefinition[]>(() => {
    if (!allowedColumns || allowedColumns.length === 0) return baseFilters;
    return [
      ...baseFilters,
      { type: "enum", column: stateMachine.column, values: [...visibleStates] },
    ];
  }, [baseFilters, allowedColumns, stateMachine.column, visibleStates]);

  const effectiveLimit = limit ?? DEFAULT_LIMIT;
  const { data } = useResourceList(resource, effectiveFilters, effectiveLimit);
  const queryKey = ["dashboard-list", resource, effectiveFilters, effectiveLimit] as const;

  const rows = useMemo(
    () => applyColumnRules(data.items as ResourceRow[], stateMachine.column, columnRules),
    [data.items, stateMachine.column, columnRules],
  );

  const cols = cardColumns ?? [];

  return (
    <StateMachineKanban<ResourceRow, string>
      rows={rows}
      getId={(r) => r.id}
      getName={(r) => formatCell(r[stateMachine.column])}
      getState={(r) => String(r[stateMachine.column] ?? "")}
      states={visibleStates}
      renderCard={(r) => (
        <button
          type="button"
          className="hover:bg-accent/50 -m-1.5 w-full cursor-pointer space-y-1 rounded-md p-1.5 text-left transition-colors"
          onClick={() =>
            // Convention: detail route is `/{resource}/{id}`. TanStack Router's
            // typed `to` doesn't accept arbitrary strings, hence the cast.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            navigate({ to: `/${resource}/${r.id}` } as any)
          }
        >
          {cols.length === 0 ? (
            <DefaultCardBody row={r} stateColumn={stateMachine.column} />
          ) : (
            cols.map((col) => (
              <CardField
                key={col}
                column={col}
                value={r[col]}
                isState={col === stateMachine.column}
              />
            ))
          )}
        </button>
      )}
      actionGroup={stateMachine.actionGroup as ActionGroupType}
      executeAction={({ actionGroup, objectId, action }) =>
        execute.mutateAsync({
          actionGroup,
          objectId,
          // Action keys form a discriminated union; at runtime `action` always
          // comes from the row's own action list.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { action, data: {} } as any,
        })
      }
      onOptimisticMove={(rowId, toState) => {
        queryClient.setQueryData<{ items: ResourceRow[]; total: number }>(
          queryKey,
          (old) =>
            old
              ? {
                  ...old,
                  items: old.items.map((it) =>
                    it.id === rowId ? { ...it, [stateMachine.column]: toState } : it,
                  ),
                }
              : old,
        );
      }}
      onRollback={() => queryClient.invalidateQueries({ queryKey })}
      onSettled={() => queryClient.invalidateQueries({ queryKey })}
    />
  );
}

function DefaultCardBody({
  row,
  stateColumn,
}: {
  row: ResourceRow;
  stateColumn: string;
}) {
  const stateValue = String(row[stateColumn] ?? "");
  return (
    <>
      <div className="text-sm font-medium">{formatCell(row.id)}</div>
      {stateValue && (
        <div className="pt-1">
          <StatusBadge status={stateValue} />
        </div>
      )}
    </>
  );
}

function CardField({
  column,
  value,
  isState,
}: {
  column: string;
  value: unknown;
  isState: boolean;
}) {
  if (isState) {
    const s = String(value ?? "");
    return s ? (
      <div className="pt-1">
        <StatusBadge status={s} />
      </div>
    ) : null;
  }
  return (
    <div className="text-muted-foreground text-xs">
      <span className="sr-only">{column}: </span>
      {formatCell(value)}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && "label" in value) {
    return String((value as { label: unknown }).label ?? "");
  }
  return String(value);
}

function applyColumnRules(
  rows: ResourceRow[],
  stateColumn: string,
  rules: Record<string, ColumnRule> | null | undefined,
): ResourceRow[] {
  if (!rules) return rows;
  const cutoffs: Record<string, number> = {};
  for (const [state, rule] of Object.entries(rules)) {
    const since = rule?.since;
    if (!since) continue;
    const ms = parseDuration(since);
    if (ms == null) continue;
    cutoffs[state] = Date.now() - ms;
  }
  if (Object.keys(cutoffs).length === 0) return rows;
  return rows.filter((row) => {
    const state = String(row[stateColumn] ?? "");
    const cutoff = cutoffs[state];
    if (cutoff == null) return true;
    const ts = row.created_at;
    if (typeof ts !== "string") return true;
    const t = Date.parse(ts);
    return Number.isFinite(t) ? t >= cutoff : true;
  });
}

function parseDuration(s: string): number | null {
  const match = /^(\d+)\s*([smhdw])$/.exec(s.trim());
  if (!match) return null;
  const n = Number(match[1]);
  const unit = match[2];
  const mult: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  return n * (mult[unit] ?? 0);
}
