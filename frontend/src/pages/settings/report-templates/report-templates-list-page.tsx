import { Suspense } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { TopLevelActions } from '@/components/object-list/top-level-actions';
import { ResourceTable } from '@/components/resource-table/resource-table';
import { useResourceTable } from '@/hooks/use-resource-table';
import { reportTemplateColumnDefs } from '@/openapi/report-templates/columns.gen';
import { useListReportTemplate } from '@/openapi/report-templates/report-templates';

export function ReportTemplatesListPage() {
  const navigate = useNavigate();
  const { tableProps } = useResourceTable({
    listQuery: useListReportTemplate,
    columns: reportTemplateColumnDefs,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Report Templates</h2>
          <p className="text-muted-foreground text-sm">
            Layouts used to generate PDF survey reports.
          </p>
        </div>
        <Suspense>
          <TopLevelActions actionGroup="report_template_actions" />
        </Suspense>
      </div>
      <ResourceTable
        {...tableProps}
        columns={reportTemplateColumnDefs}
        onRowClick={(row) =>
          navigate({
            to: '/settings/report-templates/$reportTemplateId',
            params: { reportTemplateId: String(row.id) },
          })
        }
      />
    </div>
  );
}
