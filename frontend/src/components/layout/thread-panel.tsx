import { X, MessageSquare } from 'lucide-react';
import { MessageInput } from '@/components/chat/message-input';
import { MessageList } from '@/components/chat/message-list';
import { ThreadViewers } from '@/components/chat/thread-viewers';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { useThreadSync } from '@/hooks/threads/use-thread-sync';
import { cn } from '@/lib/utils';
import type { AuthUser } from '@/lib/auth-loader';

const PANEL_WIDTH = 360;

interface ThreadPanelProps {
  open: boolean;
  onClose: () => void;
  threadableType: string;
  threadableId: string;
  title?: string;
  currentUser: AuthUser & { name?: string };
}

export function ThreadPanel({
  open,
  onClose,
  threadableType,
  threadableId,
  title,
  currentUser,
}: ThreadPanelProps) {
  const thread = useThreadSync({
    threadableType,
    threadableId,
    enabled: open,
    currentUserId: currentUser.id,
    user: currentUser,
  });

  return (
    <aside
      aria-label="Thread"
      aria-hidden={!open}
      style={{ width: open ? PANEL_WIDTH : 0 }}
      className={cn(
        'bg-sidebar sticky top-0 h-svh shrink-0 self-start overflow-hidden transition-[width] duration-200 ease-out',
        'border-sidebar-border border-l',
        open && 'shadow-[-12px_0_32px_-16px_rgba(15,23,42,0.18)]'
      )}
    >
      {open && (
        <div className="flex h-full flex-col" style={{ width: PANEL_WIDTH }}>
          <header className="border-sidebar-border flex h-14 shrink-0 items-center gap-2 border-b px-3">
            <div
              className="bg-background ring-sidebar-border flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1"
              aria-hidden
            >
              <MessageSquare className="text-muted-foreground h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="font-display truncate text-sm font-semibold tracking-tight">
                {title ?? 'Thread'}
              </div>
              <ThreadViewers viewers={thread.activeViewers} />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close thread"
              className="text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-full p-1.5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex flex-1 flex-col overflow-hidden">
            <MessageList
              messages={thread.messages}
              currentUserId={currentUser.id}
              isLoading={thread.isLoading}
              onEditMessage={thread.editMessage}
              onDeleteMessage={thread.deleteMessage}
            />
            <TypingIndicator typingUsers={thread.typingUsers} />
          </div>

          <div className="border-sidebar-border shrink-0 border-t p-3">
            <MessageInput
              onSendMessage={thread.sendMessage}
              onFocus={thread.handleInputFocus}
              onBlur={thread.handleInputBlur}
              disabled={thread.isSending}
            />
          </div>
        </div>
      )}
    </aside>
  );
}
