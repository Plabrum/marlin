import { Suspense } from 'react';
import { DeleteThreadButton } from '@/components/llm/delete-thread-button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLlmThreadsListThreadsHandlerSuspense } from '@/openapi/llm/llm';
import type { ThreadSummarySchema } from '@/openapi/litestarAPI.schemas';

const RTF = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const TIME_BUCKETS: ReadonlyArray<[string, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  for (const [unit, ms] of TIME_BUCKETS) {
    if (abs >= ms) {
      return RTF.format(
        Math.round(diff / ms),
        unit as Intl.RelativeTimeFormatUnit
      );
    }
  }
  return RTF.format(0, 'minute');
}

function HistorySkeleton() {
  return (
    <div className="flex w-72 flex-col gap-1 p-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

function ThreadHistoryRow({
  thread,
  onSelect,
  onDeleted,
  active,
}: {
  thread: ThreadSummarySchema;
  onSelect: (id: string) => void;
  onDeleted: (id: string) => void;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
        active ? 'bg-accent' : 'hover:bg-accent/60'
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(thread.id)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="flex-1 truncate">
          {thread.title ?? 'New conversation'}
        </span>
        <span className="text-muted-foreground shrink-0 text-[11px]">
          {relativeTime(thread.last_message_at)}
        </span>
      </button>
      <DeleteThreadButton
        threadId={thread.id}
        onDeleted={onDeleted}
        className="opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}

function LlmThreadHistoryInner({
  activeThreadId,
  onSelect,
}: {
  activeThreadId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { data } = useLlmThreadsListThreadsHandlerSuspense();
  const threads = data.threads;

  if (threads.length === 0) {
    return (
      <div className="text-muted-foreground w-72 p-3 text-xs">
        No conversations yet.
      </div>
    );
  }

  return (
    <div className="flex w-72 flex-col">
      <div className="text-muted-foreground px-3 pt-2 pb-1 text-[11px] tracking-wide uppercase">
        Recent
      </div>
      <div className="flex max-h-80 flex-col gap-0.5 overflow-y-auto px-1 pb-1">
        {threads.map((t) => (
          <ThreadHistoryRow
            key={t.id}
            thread={t}
            onSelect={onSelect}
            onDeleted={(deletedId) => {
              if (activeThreadId === deletedId) onSelect(null);
            }}
            active={activeThreadId === t.id}
          />
        ))}
      </div>
    </div>
  );
}

export function LlmThreadHistory({
  activeThreadId,
  onSelect,
}: {
  activeThreadId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <LlmThreadHistoryInner
        activeThreadId={activeThreadId}
        onSelect={onSelect}
      />
    </Suspense>
  );
}
