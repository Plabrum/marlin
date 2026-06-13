import { Suspense, useCallback, useState } from 'react';
import { Composer } from '@/components/llm/composer';
import { MessageBubble } from '@/components/llm/message-bubble';
import { LlmOrb } from '@/components/ui/loading-orb';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useLlmStreaming,
  type InProgressMessage,
} from '@/hooks/llm/use-llm-streaming';
import { cn } from '@/lib/utils';
import { useLlmThreadsThreadIdMessagesGetThreadMessagesHandlerSuspense } from '@/openapi/llm/llm';
import type { LlmSchemasMessageSchema as MessageSchema } from '@/openapi/litestarAPI.schemas';

export type LlmConversationProps = {
  threadId: string | null;
  onThreadCreated?: (threadId: string) => void;
  expanded?: boolean;
};

function MessageListSkeleton({ expanded }: { expanded?: boolean }) {
  return (
    <div
      className={cn(
        'flex-1 space-y-4 overflow-y-auto px-4 py-6',
        expanded && 'px-6'
      )}
    >
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="ml-auto h-16 w-2/3" />
      <Skeleton className="h-20 w-3/4" />
    </div>
  );
}

function makeOptimisticUserMessage(
  threadId: string | null,
  content: string
): MessageSchema {
  return {
    id: `temp-user-${Date.now()}`,
    thread_id: threadId ?? 'temp',
    role: 'user',
    content,
    created_at: new Date().toISOString(),
  };
}

function makeInProgressAssistantMessage(
  threadId: string | null,
  inProgress: InProgressMessage
): MessageSchema {
  return {
    id: inProgress.id,
    thread_id: threadId ?? 'temp',
    role: 'assistant',
    content: inProgress.content,
    created_at: new Date().toISOString(),
  };
}

function LlmConversationInner({
  threadId,
  onThreadCreated,
  expanded,
}: LlmConversationProps) {
  const [composerValue, setComposerValue] = useState('');
  const [optimisticUserMessages, setOptimisticUserMessages] = useState<
    MessageSchema[]
  >([]);

  const { inProgressMessage, status, send } = useLlmStreaming(
    threadId,
    onThreadCreated
  );

  if (threadId == null) {
    throw new Error('LlmConversationInner mounted with null threadId');
  }

  const { data } =
    useLlmThreadsThreadIdMessagesGetThreadMessagesHandlerSuspense(threadId);
  const fetchedMessages = data.messages;
  const isStreaming = status === 'streaming' || status === 'tool_running';

  const lastUserMessage = [...fetchedMessages, ...optimisticUserMessages]
    .filter((m) => m.role === 'user')
    .at(-1)?.content;

  const handleSend = useCallback(async () => {
    const trimmed = composerValue.trim();
    if (!trimmed || isStreaming) return;
    setComposerValue('');
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
            variant={expanded ? 'fullscreen' : 'dock'}
          />
        }
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
            <MessageBubble
              key={msg.id}
              message={msg}
              expanded={expanded}
              toolPills={msg.tool_calls?.map((tc) => ({
                id: tc.id,
                name: tc.name,
                input: tc.input,
                status: tc.is_error ? 'error' : 'ok',
              }))}
            />
          ))}
          {inProgressMessage && (
            <MessageBubble
              key="in-progress"
              message={makeInProgressAssistantMessage(
                threadId,
                inProgressMessage
              )}
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
          variant={expanded ? 'fullscreen' : 'dock'}
        />
      }
    />
  );
}

function LlmConversationNew({
  onThreadCreated,
  expanded,
}: LlmConversationProps) {
  const [composerValue, setComposerValue] = useState('');
  const [pendingUserMessage, setPendingUserMessage] =
    useState<MessageSchema | null>(null);

  const { inProgressMessage, status, send } = useLlmStreaming(
    null,
    onThreadCreated
  );
  const isStreaming = status === 'streaming' || status === 'tool_running';

  const handleSend = useCallback(async () => {
    const trimmed = composerValue.trim();
    if (!trimmed || isStreaming) return;
    setComposerValue('');
    setPendingUserMessage(makeOptimisticUserMessage(null, trimmed));
    await send(trimmed);
    setPendingUserMessage(null);
  }, [composerValue, isStreaming, send]);

  if (!inProgressMessage && !pendingUserMessage) {
    return (
      <EmptyState
        composer={
          <Composer
            value={composerValue}
            onChange={setComposerValue}
            onSubmit={handleSend}
            disabled={isStreaming}
            variant={expanded ? 'fullscreen' : 'dock'}
          />
        }
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
          variant={expanded ? 'fullscreen' : 'dock'}
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'flex-1 space-y-3 overflow-y-auto px-3 py-4',
          expanded && 'space-y-4 px-6 py-6'
        )}
      >
        {messages}
      </div>
      <div
        className={cn(
          'shrink-0',
          expanded
            ? 'border-border bg-background border-t px-4 py-3'
            : 'border-sidebar-border/60 border-t px-3 pt-2 pb-3'
        )}
      >
        {composer}
      </div>
    </div>
  );
}

function EmptyState({
  composer,
  expanded,
}: {
  composer: React.ReactNode;
  expanded?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-4 px-4',
          expanded && 'gap-6'
        )}
      >
        <LlmOrb size={expanded ? 220 : 96} showPulseRing={expanded} />
        {expanded && (
          <>
            <h1 className="font-display text-[22px] font-semibold">
              LLM Assistant
            </h1>
            <p className="text-muted-foreground text-sm">
              What's on your mind today?
            </p>
          </>
        )}
      </div>
      <div
        className={cn(
          'shrink-0',
          expanded
            ? 'border-border bg-background border-t px-4 py-3'
            : 'border-sidebar-border/60 border-t px-3 pt-2 pb-3'
        )}
      >
        {composer}
      </div>
    </div>
  );
}

export function LlmConversation(props: LlmConversationProps) {
  if (props.threadId == null) {
    return <LlmConversationNew {...props} />;
  }
  return (
    <Suspense
      fallback={<MessageListSkeleton expanded={props.expanded} />}
      key={props.threadId}
    >
      <LlmConversationInner {...props} />
    </Suspense>
  );
}
