import type { ReactNode } from 'react';

export function RailSection({
  label,
  meta,
  children,
}: {
  label: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border mb-5 border-b pb-5 last:mb-0 last:border-b-0 last:pb-0">
      <div className="text-foreground mb-3 flex items-baseline justify-between font-mono text-[10px] tracking-[0.22em] uppercase">
        <span>{label}</span>
        {meta ? <span className="text-muted-foreground">{meta}</span> : null}
      </div>
      {children}
    </div>
  );
}
