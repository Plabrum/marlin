import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LlmOrb } from "@/components/ui/loading-orb";
import { LlmConversation } from "@/components/llm/llm-conversation";
import { ConversationErrorBoundary } from "@/components/llm/conversation-error-boundary";

export function AiSurveyorEntry() {
  const [threadId, setThreadId] = useState<string | null>(null);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-2xl border bg-white p-3 text-left text-sm hover:bg-muted/40"
        >
          <LlmOrb size={28} />
          <div className="flex flex-col">
            <span className="font-medium">AI surveyor</span>
            <span className="text-xs text-muted-foreground">Ask anything about this survey</span>
          </div>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[440px] flex-col p-0 sm:max-w-[440px]">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <LlmOrb size={22} />
            AI surveyor
          </SheetTitle>
          {threadId && (
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-12 top-2 h-7 px-2 text-xs"
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
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
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
