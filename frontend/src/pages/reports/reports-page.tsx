import { FileText } from "lucide-react";
import { PageTopBar } from "@/components/layout/page-topbar";
import { EmptyState } from "@/components/layout/empty-state";

export function ReportsPage() {
  return (
    <PageTopBar title="Reports">
      <div className="p-6">
        <EmptyState
          icon={<FileText />}
          title="No reports yet"
          description="Survey reports will appear here once generated."
        />
      </div>
    </PageTopBar>
  );
}
