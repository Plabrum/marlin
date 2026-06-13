import { useNavigate } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { ResourceTable } from "@/components/resource-table/resource-table";
import { useResourceTable } from "@/hooks/use-resource-table";
import { invoiceColumnDefs } from "@/openapi/invoice/columns.gen";
import { useListInvoice } from "@/openapi/invoice/invoice";

export function InvoicesListPage() {
  const navigate = useNavigate();
  const { tableProps } = useResourceTable({ listQuery: useListInvoice, columns: invoiceColumnDefs });

  return (
    <PageTopBar
      title="Invoices"
      actions={<TopLevelActions actionGroup="invoice_actions" />}
    >
      <div className="p-6">
        <ResourceTable
          {...tableProps}
          columns={invoiceColumnDefs}
          onRowClick={(row) => navigate({ to: "/invoices/$invoiceId", params: { invoiceId: String(row.id) } })}
        />
      </div>
    </PageTopBar>
  );
}
