import { Suspense } from 'react';
import { useParams } from '@tanstack/react-router';
import { KeyValueGrid } from '@/components/layout/key-value-grid';
import { PageTopBar } from '@/components/layout/page-topbar';
import { ObjectActions } from '@/components/object-detail/object-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { humanize } from '@/lib/utils';
import { useActionsActionGroupObjectIdListObjectActions } from '@/openapi/actions/actions';
import { useReportTemplatesIdDetailHandlerSuspense } from '@/openapi/report-templates/report-templates';

function ReportTemplateDetailContent() {
  const { reportTemplateId } = useParams({
    from: '/_authenticated/settings/report-templates/$reportTemplateId',
  });
  const { data } = useReportTemplatesIdDetailHandlerSuspense(reportTemplateId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions(
      'report_template_actions',
      reportTemplateId
    );

  return (
    <PageTopBar
      title={data.name}
      actions={
        <ObjectActions
          data={{ ...data, actions: actionsData?.actions ?? [] }}
          actionGroup="report_template_actions"
          onRefetch={() => refetchActions()}
        />
      }
    >
      <div className="p-6">
        <KeyValueGrid
          items={[
            { label: 'Name', value: data.name },
            { label: 'Layout', value: humanize(data.layout_key) },
          ]}
        />
      </div>
    </PageTopBar>
  );
}

export function ReportTemplateDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar title="Report Template">
          <div className="p-6">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </PageTopBar>
      }
    >
      <ReportTemplateDetailContent />
    </Suspense>
  );
}
