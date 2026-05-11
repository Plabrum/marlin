import { cn } from "@/lib/utils";

interface WidgetSkeletonProps {
  cols: 1 | 2 | 3 | 4;
}

export function WidgetSkeleton({ cols }: WidgetSkeletonProps) {
  const height = cols === 1 ? "h-28" : "h-56";
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-muted",
        height,
        `col-span-${cols}`,
      )}
    />
  );
}
