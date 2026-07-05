import { Suspense } from 'react';
import { useParams } from '@tanstack/react-router';
import { ChildObjectList, ChildObjectRow } from '@/components/layout';
import { KeyValueGrid } from '@/components/layout/key-value-grid';
import { PageTopBar } from '@/components/layout/page-topbar';
import { ObjectActions } from '@/components/object-detail/object-actions';
import { TopLevelActions } from '@/components/object-list/top-level-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useChildObjectList } from '@/hooks/use-child-object-list';
import { formatCents } from '@/lib/format';
import { useActionsActionGroupObjectIdListObjectActions } from '@/openapi/actions/actions';
import { useQuotesIdDetailHandlerSuspense } from '@/openapi/quote/quote';
import { useListQuoteLineItem } from '@/openapi/quote-line-items/quote-line-items';
import type { QuoteLineItemListItem } from '@/openapi/litestarAPI.schemas';

function QuoteDetailContent() {
  const { quoteId } = useParams({ from: '/_authenticated/quotes/$quoteId' });
  const { data } = useQuotesIdDetailHandlerSuspense(quoteId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions('quote_actions', quoteId);

  const { items: lineItems } = useChildObjectList<QuoteLineItemListItem>({
    listQuery: useListQuoteLineItem,
    filters: [
      { type: 'text', column: 'quote_id', operation: 'equals', value: quoteId },
    ],
    defaultSorts: [{ column: 'sort_order', direction: 'asc' }],
  });

  return (
    <PageTopBar
      title={data.identifier ?? `Quote ${quoteId}`}
      state={data.state}
      actions={
        <ObjectActions
          data={{ ...data, actions: actionsData?.actions ?? [] }}
          actionGroup="quote_actions"
          onRefetch={() => refetchActions()}
        />
      }
    >
      <div className="space-y-8 p-6">
        <KeyValueGrid
          items={[
            { label: 'Quote #', value: data.identifier ?? '—' },
            { label: 'Total', value: formatCents(data.total_cents) },
            { label: 'Notes', value: data.notes ?? '—', span: 2 },
          ]}
        />

        <ChildObjectList
          title="Line items"
          badge={lineItems.length || undefined}
          topLevelActions={
            <Suspense fallback={null}>
              <TopLevelActions
                actionGroup="quote_line_item_actions"
                formContext={{ quote_id: quoteId }}
              />
            </Suspense>
          }
          items={lineItems}
          emptyMessage="No line items yet. Use Add Line Item to create one."
          renderItem={(item) => (
            <ChildObjectRow
              title={item.description}
              subtitle={`${item.quantity} × ${formatCents(item.unit_price_cents)}`}
              status={
                <span className="text-sm font-medium">
                  {formatCents(
                    Math.round(Number(item.quantity) * item.unit_price_cents)
                  )}
                </span>
              }
              actions={
                <ObjectActions
                  data={item}
                  actionGroup="quote_line_item_actions"
                />
              }
            />
          )}
        />
      </div>
    </PageTopBar>
  );
}

export function QuoteDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar title="Quote">
          <div className="p-6">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </PageTopBar>
      }
    >
      <QuoteDetailContent />
    </Suspense>
  );
}
