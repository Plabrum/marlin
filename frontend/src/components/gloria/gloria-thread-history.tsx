/**
 * Conversation history list rendered inside the dock's kebab dropdown.
 *
 * Two sections:
 *   - **Pinned** (top): client-side pin list from the dock store, joined
 *     against the recent-threads API for titles and recency.
 *   - **Recent**: the user's last N conversations, ordered by
 *     `last_message_at DESC`.
 *
 * Click row → switches the dock's active thread. Pin/unpin lives in the
 * dock store so the icon dot indicators and the kebab list stay in sync.
 */
import { Suspense } from "react";
import { Pin, PinOff } from "lucide-react";

import { DeleteThreadButton } from "@/components/gloria/delete-thread-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useLlmThreadsListThreadsSuspense,
  type ThreadSummarySchema,
} from "@/lib/gloria/api";

import {
  setActiveThreadId,
  THREAD_LIST_LIMIT,
  togglePin,
  useGloriaDockState,
} from "@/hooks/use-gloria-dock-state";

const RTF = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const TIME_BUCKETS: ReadonlyArray<[string, number]> = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  for (const [unit, ms] of TIME_BUCKETS) {
    if (abs >= ms) {
      return RTF.format(
        Math.round(diff / ms),
        unit as Intl.RelativeTimeFormatUnit,
      );
    }
  }
  return RTF.format(0, "minute");
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2 w-72">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

function ThreadHistoryRow({
  thread,
  onSelect,
  active,
}: {
  thread: ThreadSummarySchema;
  onSelect: (id: string) => void;
  active: boolean;
}) {
  const dock = useGloriaDockState();
  const pinned = dock.isPinned(thread.id);
  // Three buttons as siblings inside a flex row — outer can't be a single
  // <button> because the pin/delete toggles are separate actions, and a
  // button nested inside another button is invalid HTML.
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm",
        active ? "bg-accent" : "hover:bg-accent/60",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(thread.id)}
        className="flex flex-1 min-w-0 items-center gap-2 text-left"
      >
        <span className="flex-1 truncate">
          {thread.title ?? "New conversation"}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {relativeTime(thread.last_message_at)}
        </span>
      </button>
      <button
        type="button"
        onClick={() => togglePin(thread.id)}
        aria-label={pinned ? "Unpin conversation" : "Pin conversation"}
        title={pinned ? "Unpin" : "Pin"}
        className={cn(
          "shrink-0 p-1 rounded transition-opacity",
          pinned
            ? "text-amber-600 dark:text-amber-300 opacity-100"
            : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground",
        )}
      >
        {pinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
      </button>
      <DeleteThreadButton
        threadId={thread.id}
        onDeleted={(deletedThreadId) => {
          if (dock.state.activeThreadId === deletedThreadId) {
            setActiveThreadId(null);
          }
          if (dock.isPinned(deletedThreadId)) {
            togglePin(deletedThreadId);
          }
        }}
        className="opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}

function GloriaThreadHistoryInner() {
  const dock = useGloriaDockState();
  const { data } = useLlmThreadsListThreadsSuspense({ limit: THREAD_LIST_LIMIT });

  const threads = data.threads;
  const pinnedSet = new Set(dock.state.pinnedThreadIds);
  const pinnedThreads = threads.filter((t) => pinnedSet.has(t.id));
  const recentThreads = threads.filter((t) => !pinnedSet.has(t.id));

  function select(id: string) {
    setActiveThreadId(id);
  }

  if (threads.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground w-72">
        No conversations yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col w-72">
      {pinnedThreads.length > 0 && (
        <div className="border-b border-border">
          <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Pinned
          </div>
          <div className="px-1 pb-1 flex flex-col gap-0.5">
            {pinnedThreads.map((t) => (
              <ThreadHistoryRow
                key={t.id}
                thread={t}
                onSelect={select}
                active={dock.state.activeThreadId === t.id}
              />
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          Recent
        </div>
        <div className="px-1 pb-1 flex flex-col gap-0.5 max-h-80 overflow-y-auto">
          {recentThreads.map((t) => (
            <ThreadHistoryRow
              key={t.id}
              thread={t}
              onSelect={select}
              active={dock.state.activeThreadId === t.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function GloriaThreadHistory() {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <GloriaThreadHistoryInner />
    </Suspense>
  );
}
