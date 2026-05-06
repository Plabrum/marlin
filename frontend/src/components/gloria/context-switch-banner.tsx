/**
 * Banner shown at the top of the dock conversation when the dock has
 * just auto-scoped to a fresh thread for the current page.
 *
 * Surfaces the implicit context switch and gives the user one-click
 * options to revert to their previous conversation or accept the new
 * scope. Renders only inside the dock — the fullscreen surface owns its
 * own scope and doesn't auto-scope.
 */
import { Suspense } from "react";
import { ArrowLeft, X } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLlmThreadsListThreadsSuspense } from "@/lib/gloria/api";
import {
  dismissContextSwitch,
  restoreContextSwitch,
  THREAD_LIST_LIMIT,
  useGloriaDockState,
} from "@/hooks/use-gloria-dock-state";

function ContextSwitchBannerInner({
  previousThreadId,
}: {
  previousThreadId: string;
}) {
  const { data } = useLlmThreadsListThreadsSuspense({ limit: THREAD_LIST_LIMIT });
  const previous = data.threads.find((t) => t.id === previousThreadId);
  const previousTitle = previous?.title ?? "Previous conversation";
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900",
        "dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
      )}
    >
      <div className="flex-1 leading-snug">
        <p className="font-medium">Started a fresh chat for this page.</p>
        <button
          type="button"
          onClick={restoreContextSwitch}
          className="mt-1 inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80"
        >
          <ArrowLeft className="w-3 h-3" />
          Keep "{previousTitle}"
        </button>
      </div>
      <button
        type="button"
        onClick={dismissContextSwitch}
        aria-label="Dismiss"
        title="Dismiss"
        className="shrink-0 rounded-full p-1 hover:bg-amber-200/60 dark:hover:bg-amber-800/40 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export function ContextSwitchBanner() {
  const dock = useGloriaDockState();
  const previousThreadId = dock.state.contextSwitchPreviousThreadId;
  if (!previousThreadId) return null;
  return (
    <Suspense fallback={<Skeleton className="h-12 w-full" />}>
      <ContextSwitchBannerInner previousThreadId={previousThreadId} />
    </Suspense>
  );
}
