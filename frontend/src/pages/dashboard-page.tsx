import { PageTopBar } from "@/components/layout/page-topbar";

export function DashboardPage() {
  return (
    <PageTopBar title="Dashboard">
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Welcome to Sloopquest.</p>
      </div>
    </PageTopBar>
  );
}
