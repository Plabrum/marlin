import { useState } from 'react';
import { ConversationErrorBoundary } from '@/components/llm/conversation-error-boundary';
import { LlmConversation } from '@/components/llm/llm-conversation';
import { Button } from '@/components/ui/button';
import { LlmOrb } from '@/components/ui/loading-orb';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function AiSurveyorEntry() {
  const [threadId, setThreadId] = useState<string | null>(null);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="border-primary/40 bg-primary/5 hover:bg-primary/10 mt-6 block w-full rounded-sm border p-3 text-left transition"
        >
          <div className="mb-1 flex items-center justify-between">
            <div className="text-primary flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] uppercase">
              <span className="pulse-dot bg-primary inline-block h-1.5 w-1.5 rounded-full" />
              AI Surveyor
            </div>
            <span className="text-muted-foreground font-mono text-[10px]">
              ⌘K
            </span>
          </div>
          <p className="text-muted-foreground font-serif text-[12px] leading-[1.45] italic">
            “Ask about blistering severity, gelcoat repair specs, or anything
            else on this section…”
          </p>
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-[440px] flex-col p-0 sm:max-w-[440px]"
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <LlmOrb size={22} />
            AI surveyor
          </SheetTitle>
          {threadId && (
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-12 h-7 px-2 text-xs"
              onClick={() => setThreadId(null)}
            >
              New
            </Button>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <ConversationErrorBoundary
            threadId={threadId}
            onThreadNotFound={() => setThreadId(null)}
            fallback={
              <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
                That conversation isn't available anymore.
              </div>
            }
          >
            <LlmConversation
              threadId={threadId}
              onThreadCreated={setThreadId}
            />
          </ConversationErrorBoundary>
        </div>
      </SheetContent>
    </Sheet>
  );
}
