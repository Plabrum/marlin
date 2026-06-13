import { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { ResourceTable } from "@/components/resource-table/resource-table";
import { useResourceTable } from "@/hooks/use-resource-table";
import { reportColumnDefs } from "@/openapi/report/columns.gen";
import { useListReport } from "@/openapi/report/report";

export function ReportsPage() {
  const navigate = useNavigate();
  const { tableProps } = useResourceTable({ listQuery: useListReport, columns: reportColumnDefs });

  return (
    <PageTopBar
      title="Reports"
      actions={
        <Suspense>
          <TopLevelActions actionGroup="report_actions" />
        </Suspense>
      }
    >
      <div className="p-6">
        <ResourceTable
          {...tableProps}
          columns={reportColumnDefs}
          onRowClick={(row) => navigate({ to: "/reports/$reportId", params: { reportId: String(row.id) } })}
        />
      </div>
    </PageTopBar>
  );
}
