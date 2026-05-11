import { Suspense } from "react";
import { WidgetSkeleton } from "./widget-skeleton";
import { AreaChartWidget } from "./widgets/area-chart-widget";
import { BarChartWidget } from "./widgets/bar-chart-widget";
import { StatCardsWidget } from "./widgets/stat-cards-widget";
import { ResourceTableWidget } from "./widgets/resource-table-widget";
import { ChildListWidget } from "./widgets/child-list-widget";
import type {
  AreaChartWidgetConfig,
  BarChartWidgetConfig,
  ChildListWidgetConfig,
  DashboardConfig,
  ResourceTableWidgetConfig,
  StatCardsWidgetConfig,
  WidgetConfig,
} from "./types";

function WidgetContent({ widget }: { widget: WidgetConfig }) {
  switch (widget.type) {
    case "area_chart":
      return <AreaChartWidget config={widget as AreaChartWidgetConfig} />;
    case "bar_chart":
      return <BarChartWidget config={widget as BarChartWidgetConfig} />;
    case "stat_cards":
      return <StatCardsWidget config={widget as StatCardsWidgetConfig} />;
    case "resource_table":
      return <ResourceTableWidget config={widget as ResourceTableWidgetConfig} />;
    case "child_list":
      return <ChildListWidget config={widget as ChildListWidgetConfig} />;
    default:
      return null;
  }
}

interface DashboardRendererProps {
  config: DashboardConfig;
}

export function DashboardRenderer({ config }: DashboardRendererProps) {
  if (config.widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-base font-medium text-foreground">Your dashboard is empty</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Open the chat and ask the AI to add widgets, e.g. "Add a revenue chart for the last 90 days"
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {config.widgets.map((widget) => (
        <div key={widget.id} className={`col-span-${widget.cols}`}>
          <Suspense fallback={<WidgetSkeleton cols={widget.cols} />}>
            <WidgetContent widget={widget} />
          </Suspense>
        </div>
      ))}
    </div>
  );
}
