import { ClipboardList } from "lucide-react";
import { PageTopBar } from "@/components/layout/page-topbar";
import { EmptyState } from "@/components/layout/empty-state";

export function SurveysListPage() {
  return (
    <PageTopBar title="Surveys">
      <div className="p-6">
        <EmptyState
          icon={<ClipboardList />}
          title="No surveys yet"
          description="Surveys will appear here once created."
        />
      </div>
    </PageTopBar>
  );
}
