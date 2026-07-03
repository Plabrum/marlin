import { Suspense } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChildObjectList, ChildObjectRow } from '@/components/layout';
import { ObjectActions } from '@/components/object-detail/object-actions';
import { TopLevelActions } from '@/components/object-list/top-level-actions';
import { StatusDot } from '@/components/status-badge';
import { useChildObjectList } from '@/hooks/use-child-object-list';
import { formatCents } from '@/lib/format';
import { getStatusConfig } from '@/lib/status-colors';
import { useListInvoice } from '@/openapi/invoice/invoice';
import { useListReport } from '@/openapi/report/report';
import { FindingsList } from './findings-list';
import { useSurveyTree } from './use-survey-tree';
import { VesselCard } from './vessel-card';
import type {
  InvoiceListItem,
  ReportListItem,
  SurveyDetail,
} from '@/openapi/litestarAPI.schemas';

function StatusText({ status }: { status: string }) {
  const config = getStatusConfig(status);
  return (
    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <StatusDot variant={config.variant} />
      {config.label}
    </span>
  );
}

export function SurveyCompletedView({ data }: { data: SurveyDetail }) {
  const navigate = useNavigate();
  const { findings, sectionAncestor } = useSurveyTree(
    data.form_nodes,
    data.section_completion
  );

  const { items: reports } = useChildObjectList<ReportListItem>({
    listQuery: useListReport,
    filters: [
      {
        type: 'text',
        column: 'survey_id',
        operation: 'equals',
        value: data.id,
      },
    ],
  });

  const { items: invoices } = useChildObjectList<InvoiceListItem>({
    listQuery: useListInvoice,
    filters: [
      {
        type: 'text',
        column: 'survey_id',
        operation: 'equals',
        value: data.id,
      },
    ],
  });

  return (
    <div className="grid grid-cols-1 gap-8 p-6 lg:grid-cols-2">
      <div>
        <VesselCard data={data} />
        <FindingsList
          findings={findings}
          sectionAncestor={sectionAncestor}
          goToSection={() => {}}
        />
      </div>

      <div className="space-y-8">
        <ChildObjectList
          title="Reports"
          badge={reports.length || undefined}
          topLevelActions={
            <Suspense fallback={null}>
              <TopLevelActions
                actionGroup="report_actions"
                formContext={{ survey_id: data.id }}
                maxVisible={0}
              />
            </Suspense>
          }
          items={reports}
          emptyMessage="No reports yet."
          renderItem={(item) => (
            <ChildObjectRow
              title={item.title ?? 'Untitled report'}
              status={<StatusText status={item.state} />}
              onClick={() => navigate({ to: `/reports/${item.id}` })}
              actions={
                <ObjectActions
                  data={item}
                  actionGroup="report_actions"
                  maxVisible={0}
                />
              }
            />
          )}
        />

        <ChildObjectList
          title="Invoices"
          badge={invoices.length || undefined}
          items={invoices}
          emptyMessage="No invoices yet."
          renderItem={(item) => (
            <ChildObjectRow
              title={item.identifier ?? 'Draft invoice'}
              status={
                <div className="flex items-center gap-3">
                  <StatusText status={item.state} />
                  <span className="text-sm font-medium">
                    {formatCents(item.total_cents)}
                  </span>
                </div>
              }
              onClick={() => navigate({ to: `/invoices/${item.id}` })}
              actions={
                <ObjectActions
                  data={item}
                  actionGroup="invoice_actions"
                  maxVisible={0}
                />
              }
            />
          )}
        />
      </div>
    </div>
  );
}
