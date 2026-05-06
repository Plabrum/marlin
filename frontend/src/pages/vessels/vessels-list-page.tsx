import { Sailboat } from "lucide-react";
import { PageTopBar } from "@/components/layout/page-topbar";
import { EmptyState } from "@/components/layout/empty-state";

export function VesselsListPage() {
  return (
    <PageTopBar title="Vessels">
      <div className="p-6">
        <EmptyState
          icon={<Sailboat />}
          title="No vessels yet"
          description="Vessels will appear here once added."
        />
      </div>
    </PageTopBar>
  );
}
