import { useNavigate } from '@tanstack/react-router';
import { PageTopBar } from '@/components/layout/page-topbar';
import { TopLevelActions } from '@/components/object-list/top-level-actions';
import { ResourceTable } from '@/components/resource-table/resource-table';
import { useResourceTable } from '@/hooks/use-resource-table';
import { quoteColumnDefs } from '@/openapi/quote/columns.gen';
import { useListQuote } from '@/openapi/quote/quote';

export function QuotesListPage() {
  const navigate = useNavigate();
  const { tableProps } = useResourceTable({
    listQuery: useListQuote,
    columns: quoteColumnDefs,
  });

  return (
    <PageTopBar
      title="Quotes"
      actions={<TopLevelActions actionGroup="quote_actions" />}
    >
      <div className="p-6">
        <ResourceTable
          {...tableProps}
          columns={quoteColumnDefs}
          onRowClick={(row) =>
            navigate({
              to: '/quotes/$quoteId',
              params: { quoteId: String(row.id) },
            })
          }
        />
      </div>
    </PageTopBar>
  );
}
