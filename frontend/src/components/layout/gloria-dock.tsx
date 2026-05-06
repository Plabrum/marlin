/**
 * Right-side docked Gloria panel.
 *
 * Hand-rolled flex panel — explicitly NOT shadcn `Sheet`. Sheet renders
 * a fullscreen overlay/scrim and floats above content; the dock spec
 * calls for the dock to take layout space and squeeze the page beside
 * it. Rendered as a flex sibling of `<main>` inside `<SidebarInset>`.
 *
 * Width animates between 0 (hidden) and 400 (open). When closed the
 * conversation tree unmounts so streaming hooks shut down cleanly.
 */
import { Suspense } from "react";
import { MoreHorizontal, SquarePen, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GloriaOrb } from "@/components/ui/loading-orb";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLlmThreadsListThreadsSuspense } from "@/lib/gloria/api";

import { ConversationErrorBoundary } from "@/components/gloria/conversation-error-boundary";
import { GloriaConversation } from "@/components/gloria/gloria-conversation";
import { GloriaThreadHistory } from "@/components/gloria/gloria-thread-history";
import {
  closeDock,
  setActiveThreadId,
  THREAD_LIST_LIMIT,
  useGloriaDockState,
} from "@/hooks/use-gloria-dock-state";

const DOCK_WIDTH = 400;

function ActiveThreadSubtitleInner({ threadId }: { threadId: string }) {
  const { data } = useLlmThreadsListThreadsSuspense({ limit: THREAD_LIST_LIMIT });
  const match = data.threads.find((t) => t.id === threadId);
  return (
    <span className="truncate text-xs text-muted-foreground">
      {match?.title ?? "Conversation"}
    </span>
  );
}

/**
 * Subtitle shown under the "Gloria" wordmark — empty for new threads
 * (the brand line carries the affordance), or the persisted thread title.
 */
function ActiveThreadSubtitle({ threadId }: { threadId: string | null }) {
  if (!threadId) {
    return (
      <span className="truncate text-xs text-muted-foreground">
        Ask anything to start a conversation
      </span>
    );
  }
  return (
    <Suspense fallback={<Skeleton className="h-3 w-28 mt-0.5" />}>
      <ActiveThreadSubtitleInner threadId={threadId} />
    </Suspense>
  );
}

export function GloriaDock() {
  const dock = useGloriaDockState();
  const isOpen = dock.state.mode === "docked";

  // TODO: when Sloopquest gains a fullscreen Gloria route, hide the dock
  // there and wire an "Open fullscreen" affordance back into the kebab menu.

  return (
    <aside
      role="complementary"
      aria-label="Gloria assistant"
      aria-hidden={!isOpen}
      style={{ width: isOpen ? DOCK_WIDTH : 0 }}
      className={cn(
        // `sticky top-0 h-svh` pins the dock to the viewport so it stays
        // visible while long page content scrolls underneath. The dock's
        // own messages list scrolls internally; the page itself keeps
        // its natural vertical flow.
        "sticky top-0 h-svh self-start overflow-hidden bg-sidebar shrink-0 transition-[width] duration-200 ease-out",
        "border-l border-sidebar-border",
        isOpen && "shadow-[-12px_0_32px_-16px_rgba(15,23,42,0.18)]",
      )}
    >
      {isOpen && (
        <div className="flex h-full flex-col" style={{ width: DOCK_WIDTH }}>
          {/* Header height matches `PageTopBar` (h-14) so the dock's
              bottom border lines up with the page topbar's bottom border. */}
          <header className="flex h-14 items-center gap-2 px-3 border-b border-sidebar-border shrink-0">
            <div
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-background ring-1 ring-sidebar-border"
              aria-hidden
            >
              <GloriaOrb size={20} />
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="font-display text-sm font-semibold tracking-tight">
                Gloria
              </div>
              <ActiveThreadSubtitle threadId={dock.state.activeThreadId} />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Conversation options"
                  className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-0">
                <div className="px-1 py-1">
                  <DropdownMenuItem onSelect={() => setActiveThreadId(null)}>
                    <SquarePen className="w-4 h-4 mr-2" />
                    New conversation
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator className="m-0" />
                <GloriaThreadHistory />
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={closeDock}
              aria-label="Close Gloria"
              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          <ConversationErrorBoundary
            threadId={dock.state.activeThreadId}
            fallback={
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                <p>That conversation isn't available anymore.</p>
                <button
                  type="button"
                  onClick={() => setActiveThreadId(null)}
                  className="text-xs underline hover:text-foreground"
                >
                  Start a new one
                </button>
              </div>
            }
          >
            <GloriaConversation
              threadId={dock.state.activeThreadId}
              onThreadCreated={(id) => setActiveThreadId(id)}
            />
          </ConversationErrorBoundary>
        </div>
      )}
    </aside>
  );
}
