/**
 * Gloria conversation surface.
 *
 * Single source of truth for the chat UI rendered by both the dock and
 * the fullscreen page. Owns:
 *   - Composer text + send wiring
 *   - Streaming hook subscription (`useGloriaStreaming`)
 *   - Optimistic user message until the post-stream refetch reconciles
 *
 * Re-keyed by `threadId` at the call site so switching conversations
 * gives a fresh streaming hook (in-flight stream is aborted on unmount
 * — the server's stream finally block still persists).
 */
import { Suspense, useCallback, useEffect, useState } from "react";

import { GloriaOrb } from "@/components/ui/loading-orb";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useLlmThreadsThreadIdMessagesGetMessagesSuspense,
  type MessageSchema,
} from "@/lib/gloria/api";

import {
  consumePendingSeedMessage,
  dismissContextSwitch,
  useGloriaDockState,
} from "@/hooks/use-gloria-dock-state";

import { Composer } from "@/components/gloria/composer";
import { ContextSwitchBanner } from "@/components/gloria/context-switch-banner";
import { MessageBubble } from "@/components/gloria/message-bubble";
import { QuickPrompts } from "@/components/gloria/quick-prompts";
import {
  useGloriaStreaming,
  type InProgressMessage,
} from "@/hooks/use-gloria-streaming";

export type GloriaConversationProps = {
  threadId: string | null;
  /** Called when a fresh thread is created via this conversation. */
  onThreadCreated?: (threadId: string) => void;
  /** Fullscreen layout (wider, shows mic affordance) vs dock. */
  expanded?: boolean;
};

function MessageListSkeleton({ expanded }: { expanded?: boolean }) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto px-4 py-6 space-y-4",
        expanded && "px-6",
      )}
    >
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-16 w-2/3 ml-auto" />
      <Skeleton className="h-20 w-3/4" />
    </div>
  );
}

function makeOptimisticUserMessage(
  threadId: string | null,
  content: string,
): MessageSchema {
  return {
    id: `temp-user-${Date.now()}`,
    thread_id: threadId ?? "temp",
    role: "user",
    content,
    created_at: new Date().toISOString(),
  };
}

function makeInProgressAssistantMessage(
  threadId: string | null,
  inProgress: InProgressMessage,
): MessageSchema {
  return {
    id: inProgress.id,
    thread_id: threadId ?? "temp",
    role: "assistant",
    content: inProgress.content,
    created_at: new Date().toISOString(),
  };
}

function GloriaConversationInner({
  threadId,
  onThreadCreated,
  expanded,
}: GloriaConversationProps) {
  const dock = useGloriaDockState();
  const [composerValue, setComposerValue] = useState("");
  const [optimisticUserMessages, setOptimisticUserMessages] = useState<
    MessageSchema[]
  >([]);

  const { inProgressMessage, status, send } = useGloriaStreaming(
    threadId,
    onThreadCreated,
  );

  // Defensive non-null assertion — the outer `<GloriaConversation>`
  // splits on `threadId == null` and routes to `<GloriaConversationNew>`
  // before this inner ever mounts, but guard here so a future routing
  // refactor can't silently fetch `/threads/null/messages`.
  if (threadId == null) {
    throw new Error(
      "GloriaConversationInner mounted with null threadId — render <GloriaConversationNew> instead",
    );
  }
  const { data } = useLlmThreadsThreadIdMessagesGetMessagesSuspense(threadId);
  const fetchedMessages = data.messages;

  const isStreaming =
    status === "streaming" || status === "tool_running";

  const lastUserMessage =
    [...fetchedMessages, ...optimisticUserMessages]
      .filter((m) => m.role === "user")
      .at(-1)?.content;

  const handleSend = useCallback(async () => {
    const trimmed = composerValue.trim();
    if (!trimmed || isStreaming) return;
    setComposerValue("");
    setOptimisticUserMessages((prev) => [
      ...prev,
      makeOptimisticUserMessage(threadId, trimmed),
    ]);
    await send(trimmed);
    setOptimisticUserMessages([]);
  }, [composerValue, isStreaming, threadId, send]);

  const messagesForRender = [...fetchedMessages, ...optimisticUserMessages];
  const isEmpty = messagesForRender.length === 0 && inProgressMessage == null;

  if (isEmpty) {
    return (
      <EmptyState
        composer={
          <Composer
            value={composerValue}
            onChange={setComposerValue}
            onSubmit={handleSend}
            disabled={isStreaming}
            focusComposerPending={dock.focusComposerPending}
            variant={expanded ? "fullscreen" : "dock"}
          />
        }
        quickPrompts={<QuickPrompts onPick={(prompt) => setComposerValue(prompt)} />}
        expanded={expanded}
      />
    );
  }

  return (
    <ConversationLayout
      expanded={expanded}
      messages={
        <>
          {messagesForRender.map((msg) => (
            <MessageBubble key={msg.id} message={msg} expanded={expanded} />
          ))}
          {inProgressMessage && (
            <MessageBubble
              key="in-progress"
              message={makeInProgressAssistantMessage(threadId, inProgressMessage)}
              isInProgress
              expanded={expanded}
              toolPills={inProgressMessage.toolPills}
            />
          )}
        </>
      }
      composer={
        <Composer
          value={composerValue}
          onChange={setComposerValue}
          onSubmit={handleSend}
          disabled={isStreaming}
          lastUserMessage={lastUserMessage}
          focusComposerPending={dock.focusComposerPending}
          variant={expanded ? "fullscreen" : "dock"}
        />
      }
    />
  );
}

/**
 * Special-case inner for the "no threadId yet" case — skip the messages
 * Suspense query entirely.
 */
function GloriaConversationNew({
  onThreadCreated,
  expanded,
}: GloriaConversationProps) {
  const dock = useGloriaDockState();
  const [composerValue, setComposerValue] = useState("");
  // Track the user's just-sent message so the conversation shows their
  // turn immediately — without this the user sees only the typing dots
  // until `message_complete` re-keys to GloriaConversationInner. Cleared
  // when the streaming send promise resolves (success or error).
  const [pendingUserMessage, setPendingUserMessage] =
    useState<MessageSchema | null>(null);

  const { inProgressMessage, status, send } = useGloriaStreaming(
    null,
    onThreadCreated,
  );

  const isStreaming =
    status === "streaming" || status === "tool_running";

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreaming) return;
      setPendingUserMessage(makeOptimisticUserMessage(null, content));
      // User committed to the new context — clear the "keep previous"
      // banner if it was showing.
      dismissContextSwitch();
      await send(content);
      setPendingUserMessage(null);
    },
    [isStreaming, send],
  );

  const handleSend = useCallback(async () => {
    const trimmed = composerValue.trim();
    if (!trimmed) return;
    setComposerValue("");
    await sendMessage(trimmed);
  }, [composerValue, sendMessage]);

  // Dashboard hero stashes a seed message via `seedComposer`; consume +
  // auto-send on mount. The consume + send pair is wrapped in a
  // `queueMicrotask` (defers the setState cascade outside this effect's
  // render cycle) and a `cancelled` ref (so an effect re-run from a
  // `sendMessage` dep change can't double-fire). Together these make
  // the consume the single point of truth.
  useEffect(() => {
    if (dock.pendingSeedMessage == null || isStreaming) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const seed = consumePendingSeedMessage();
      if (seed != null) void sendMessage(seed);
    });
    return () => {
      cancelled = true;
    };
  }, [dock.pendingSeedMessage, isStreaming, sendMessage]);

  if (!inProgressMessage && !pendingUserMessage) {
    return (
      <EmptyState
        composer={
          <Composer
            value={composerValue}
            onChange={setComposerValue}
            onSubmit={handleSend}
            disabled={isStreaming}
            focusComposerPending={dock.focusComposerPending}
            variant={expanded ? "fullscreen" : "dock"}
          />
        }
        quickPrompts={<QuickPrompts onPick={(prompt) => setComposerValue(prompt)} />}
        expanded={expanded}
      />
    );
  }

  return (
    <ConversationLayout
      expanded={expanded}
      messages={
        <>
          {pendingUserMessage && (
            <MessageBubble
              key={pendingUserMessage.id}
              message={pendingUserMessage}
              expanded={expanded}
            />
          )}
          {inProgressMessage && (
            <MessageBubble
              key="in-progress"
              message={makeInProgressAssistantMessage(null, inProgressMessage)}
              isInProgress
              expanded={expanded}
              toolPills={inProgressMessage.toolPills}
            />
          )}
        </>
      }
      composer={
        <Composer
          value={composerValue}
          onChange={setComposerValue}
          onSubmit={handleSend}
          disabled={isStreaming}
          focusComposerPending={dock.focusComposerPending}
          variant={expanded ? "fullscreen" : "dock"}
        />
      }
    />
  );
}

function ConversationLayout({
  expanded,
  messages,
  composer,
}: {
  expanded?: boolean;
  messages: React.ReactNode;
  composer: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col min-h-0">
      {!expanded && (
        <div className="px-3 pt-2 shrink-0 empty:hidden">
          <ContextSwitchBanner />
        </div>
      )}
      <div
        className={cn(
          "flex-1 overflow-y-auto px-3 py-4 space-y-3",
          expanded && "px-6 py-6 space-y-4",
        )}
      >
        {messages}
      </div>
      <div
        className={cn(
          "shrink-0",
          expanded
            ? "border-t border-border bg-background px-4 py-3"
            : "px-3 pt-2 pb-3 border-t border-sidebar-border/60",
        )}
      >
        {composer}
      </div>
    </div>
  );
}

function EmptyState({
  composer,
  quickPrompts,
  expanded,
}: {
  composer: React.ReactNode;
  quickPrompts: React.ReactNode;
  expanded?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col min-h-0">
      {!expanded && (
        <div className="px-3 pt-2 shrink-0 empty:hidden">
          <ContextSwitchBanner />
        </div>
      )}
      <div
        className={cn(
          "flex-1 flex flex-col items-center justify-center px-4 gap-4",
          expanded && "gap-6",
        )}
      >
        <GloriaOrb size={expanded ? 220 : 96} showPulseRing={expanded} />
        {expanded && (
          <>
            <h1 className="font-display text-[22px] font-semibold">Gloria</h1>
            <p className="text-sm text-muted-foreground">
              What's on your mind today?
            </p>
          </>
        )}
        {quickPrompts}
      </div>
      <div
        className={cn(
          "shrink-0",
          expanded
            ? "border-t border-border bg-background px-4 py-3"
            : "px-3 pt-2 pb-3 border-t border-sidebar-border/60",
        )}
      >
        {composer}
      </div>
    </div>
  );
}

export function GloriaConversation(props: GloriaConversationProps) {
  // Outer Suspense + thread-id-keyed inner so each conversation gets a
  // fresh streaming hook. The "new thread" path renders a sibling that
  // skips the messages Suspense query entirely.
  if (props.threadId == null) {
    return <GloriaConversationNew {...props} />;
  }
  return (
    <Suspense
      fallback={<MessageListSkeleton expanded={props.expanded} />}
      key={props.threadId}
    >
      <GloriaConversationInner {...props} />
    </Suspense>
  );
}
