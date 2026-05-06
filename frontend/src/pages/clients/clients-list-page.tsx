import { Users } from "lucide-react";
import { PageTopBar } from "@/components/layout/page-topbar";
import { EmptyState } from "@/components/layout/empty-state";

export function ClientsListPage() {
  return (
    <PageTopBar title="Clients">
      <div className="p-6">
        <EmptyState
          icon={<Users />}
          title="No clients yet"
          description="Clients will appear here once added."
        />
      </div>
    </PageTopBar>
  );
}
