import { Link } from "@tanstack/react-router";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardColor = "blue" | "green" | "red" | "yellow";

interface StatCardProps {
  value: string | number;
  label: string;
  change?: { value: number; direction: "up" | "down" | "flat" };
  color?: StatCardColor;
  href?: string;
  className?: string;
}

interface StatCardsProps {
  stats: StatCardProps[];
  className?: string;
}

function StatCard({ value, label, change, href, className }: StatCardProps) {
  const card = (
    <Card
      className={cn(
        "gap-0 py-5 transition-shadow",
        href && "hover:shadow-md",
        className,
      )}
    >
      <CardHeader className="gap-1.5 px-5">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums tracking-tight">
          {value}
        </CardTitle>
        {change && change.direction !== "flat" && (
          <CardAction>
            <Badge
              variant="outline"
              className={cn(
                "gap-1",
                change.direction === "up"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {change.direction === "up" ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {Math.abs(change.value).toFixed(1)}%
            </Badge>
          </CardAction>
        )}
      </CardHeader>
    </Card>
  );

  if (href) {
    return (
      <Link to={href} className="block">
        {card}
      </Link>
    );
  }
  return card;
}

export function StatCards({ stats, className }: StatCardsProps) {
  return (
    <div
      className={cn("grid gap-4", className)}
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
    >
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}

export { StatCard };
export type { StatCardProps, StatCardsProps, StatCardColor };
