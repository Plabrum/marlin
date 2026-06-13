import { createContext, useContext, useRef } from 'react';
import { Mic, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ComposerFocusContext =
  createContext<React.RefObject<HTMLInputElement | null> | null>(null);

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  lastUserMessage?: string;
  variant?: 'dock' | 'fullscreen';
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  lastUserMessage,
  variant = 'dock',
  placeholder = 'Send a message…',
  inputRef: externalInputRef,
}: Props) {
  const internalInputRef = useRef<HTMLInputElement>(null);
  const contextRef = useContext(ComposerFocusContext);
  const inputRef = externalInputRef ?? contextRef ?? internalInputRef;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowUp' && value.length === 0 && lastUserMessage) {
      e.preventDefault();
      onChange(lastUserMessage);
    }
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        variant === 'fullscreen' && 'mx-auto max-w-3xl gap-3'
      )}
    >
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Send a message"
          className={cn(
            'bg-secondary border-input focus:border-ring w-full rounded-full border-[1.5px] text-sm transition-colors outline-none disabled:opacity-60',
            variant === 'dock' ? 'py-2.5 pr-12 pl-4' : 'py-3 pr-14 pl-5'
          )}
        />
        <button
          type="button"
          onClick={() => canSend && onSubmit()}
          disabled={!canSend}
          aria-label="Send"
          className={cn(
            'bg-primary text-primary-foreground hover:bg-primary/90 absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full transition-colors disabled:opacity-40',
            variant === 'dock'
              ? 'right-1 h-[30px] w-[30px]'
              : 'right-1.5 h-[34px] w-[34px]'
          )}
        >
          <Send className={variant === 'dock' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        </button>
      </div>
      {variant === 'fullscreen' && (
        <button
          type="button"
          disabled
          aria-label="Voice input (coming soon)"
          title="Voice input (coming soon)"
          className="bg-primary text-primary-foreground flex h-[46px] w-[46px] shrink-0 cursor-not-allowed items-center justify-center rounded-full opacity-50 shadow-lg"
        >
          <Mic className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
