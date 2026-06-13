import { Skeleton } from '@/components/ui/skeleton';

export function CalendarSkeleton() {
  return (
    <div className="bg-border grid grid-cols-7 gap-px rounded-lg border">
      {Array.from({ length: 42 }).map((_, i) => (
        <Skeleton key={i} className="bg-background h-28 rounded-none" />
      ))}
    </div>
  );
}
