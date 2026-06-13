import { Suspense, useCallback, useEffect, useRef } from 'react';
import { MoreHorizontal, SquarePen, X } from 'lucide-react';
import { LlmMinimizedIcon } from '@/components/layout/llm-minimized-icon';
import { ComposerFocusContext } from '@/components/llm/composer';
import { ConversationErrorBoundary } from '@/components/llm/conversation-error-boundary';
import { LlmConversation } from '@/components/llm/llm-conversation';
import { LlmThreadHistory } from '@/components/llm/llm-thread-history';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LlmOrb } from '@/components/ui/loading-orb';
import { Skeleton } from '@/components/ui/skeleton';
import { useLlmDockState } from '@/hooks/llm/use-llm-dock-state';
import { useShortcut } from '@/lib/shortcuts';
import { cn } from '@/lib/utils';
import { useLlmThreadsListThreadsHandlerSuspense } from '@/openapi/llm/llm';

const DOCK_WIDTH = 400;

function ActiveThreadSubtitleInner({ threadId }: { threadId: string }) {
  const { data } = useLlmThreadsListThreadsHandlerSuspense();
  const match = data.threads.find((t) => t.id === threadId);
  return (
    <span className="text-muted-foreground truncate text-xs">
      {match?.title ?? 'Conversation'}
    </span>
  );
}

function ActiveThreadSubtitle({ threadId }: { threadId: string | null }) {
  if (!threadId) {
    return (
      <span className="text-muted-foreground truncate text-xs">
        Ask anything to start a conversation
      </span>
    );
  }
  return (
    <Suspense fallback={<Skeleton className="mt-0.5 h-3 w-28" />}>
      <ActiveThreadSubtitleInner threadId={threadId} />
    </Suspense>
  );
}

export function LlmDock() {
  const dock = useLlmDockState();
  const isOpen = dock.mode === 'docked';
  const composerInputRef = useRef<HTMLInputElement>(null);

  useShortcut({
    id: 'dock.toggle',
    keys: 'mod+shift+g',
    scope: 'global',
    label: 'Toggle LLM assistant',
    allowInFields: true,
    handler: dock.toggleDock,
  });

  useShortcut({
    id: 'dock.focus-composer',
    keys: 'mod+j',
    scope: 'global',
    label: 'Focus assistant composer',
    allowInFields: true,
    when: useCallback(() => isOpen, [isOpen]),
    handler: useCallback(() => composerInputRef.current?.focus(), []),
  });

  useEffect(() => {
    if (isOpen) {
      composerInputRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <>
      <LlmMinimizedIcon isOpen={isOpen} />
      <aside
        aria-label="LLM assistant"
        aria-hidden={!isOpen}
        style={{ width: isOpen ? DOCK_WIDTH : 0 }}
        className={cn(
          'bg-sidebar sticky top-0 h-svh shrink-0 self-start overflow-hidden transition-[width] duration-200 ease-out',
          'border-sidebar-border border-l',
          isOpen && 'shadow-[-12px_0_32px_-16px_rgba(15,23,42,0.18)]'
        )}
      >
        {isOpen && (
          <div className="flex h-full flex-col" style={{ width: DOCK_WIDTH }}>
            <header className="border-sidebar-border flex h-14 shrink-0 items-center gap-2 border-b px-3">
              <div
                className="bg-background ring-sidebar-border flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1"
                aria-hidden
              >
                <LlmOrb size={20} />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="font-display text-sm font-semibold tracking-tight">
                  LLM Assistant
                </div>
                <ActiveThreadSubtitle threadId={dock.activeThreadId} />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Conversation options"
                    className="text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-full p-1.5 transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 p-0">
                  <div className="px-1 py-1">
                    <DropdownMenuItem
                      onSelect={() => dock.setActiveThreadId(null)}
                    >
                      <SquarePen className="mr-2 h-4 w-4" />
                      New conversation
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="m-0" />
                  <LlmThreadHistory
                    activeThreadId={dock.activeThreadId}
                    onSelect={dock.setActiveThreadId}
                  />
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={dock.closeDock}
                aria-label="Close assistant"
                className="text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-full p-1.5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <ConversationErrorBoundary
              threadId={dock.activeThreadId}
              onThreadNotFound={() => dock.setActiveThreadId(null)}
              fallback={
                <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm">
                  <p>That conversation isn't available anymore.</p>
                  <button
                    type="button"
                    onClick={() => dock.setActiveThreadId(null)}
                    className="hover:text-foreground text-xs underline"
                  >
                    Start a new one
                  </button>
                </div>
              }
            >
              <ComposerFocusContext.Provider value={composerInputRef}>
                <LlmConversation
                  threadId={dock.activeThreadId}
                  onThreadCreated={(id) => dock.setActiveThreadId(id)}
                />
              </ComposerFocusContext.Provider>
            </ConversationErrorBoundary>
          </div>
        )}
      </aside>
    </>
  );
}
