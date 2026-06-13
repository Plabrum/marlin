/**
 * One inline tool-call pill rendered inside an assistant message bubble.
 *
 * Status semantics:
 *   - running: spinner + tool name, expandable to show input args
 *   - ok:      ✓ + tool name
 *   - error:   ⚠ + tool name; click to expand input
 */
import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ToolPill as ToolPillType,
  ToolPillStatus,
} from '@/hooks/llm/use-llm-streaming';

const STATUS_TONE: Record<ToolPillStatus, string> = {
  running: 'bg-muted text-muted-foreground border-border',
  ok: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900',
  error:
    'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
};

function StatusIcon({ status }: { status: ToolPillStatus }) {
  if (status === 'running')
    return <Loader2 className="h-3 w-3 animate-spin" aria-hidden />;
  if (status === 'error')
    return <TriangleAlert className="h-3 w-3" aria-hidden />;
  return <Check className="h-3 w-3" aria-hidden />;
}

const STATUS_LABEL: Record<ToolPillStatus, string> = {
  running: 'running',
  ok: 'completed',
  error: 'errored',
};

function humanizeName(name: string): string {
  return name.replaceAll('_', ' ');
}

export function ToolPill({ pill }: { pill: ToolPillType }) {
  const [expanded, setExpanded] = useState(false);
  const hasInput = Object.keys(pill.input).length > 0;

  return (
    <div
      className={cn(
        'my-1 inline-flex max-w-full flex-col rounded-md border text-xs',
        STATUS_TONE[pill.status]
      )}
    >
      <button
        type="button"
        onClick={() => hasInput && setExpanded((v) => !v)}
        disabled={!hasInput}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 font-mono',
          hasInput && 'cursor-pointer hover:opacity-80'
        )}
        aria-label={`Tool ${pill.name} ${STATUS_LABEL[pill.status]}`}
      >
        <StatusIcon status={pill.status} />
        <span>{humanizeName(pill.name)}</span>
        {hasInput &&
          (expanded ? (
            <ChevronDown className="h-3 w-3" aria-hidden />
          ) : (
            <ChevronRight className="h-3 w-3" aria-hidden />
          ))}
      </button>
      {expanded && hasInput && (
        <pre className="overflow-x-auto px-2 pb-1.5 text-[11px] leading-snug break-words whitespace-pre-wrap">
          {JSON.stringify(pill.input, null, 2)}
        </pre>
      )}
    </div>
  );
}
