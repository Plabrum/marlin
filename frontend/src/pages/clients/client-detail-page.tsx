import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { Skeleton } from "@/components/ui/skeleton";

function ClientDetailContent() {
  const { clientId } = useParams({ from: "/_authenticated/clients/$clientId" });

  return (
    <PageTopBar
      title="Client"
      breadcrumbSegments={[{ label: "Clients", href: "/clients" }]}
    >
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Client ID: {clientId}</p>
      </div>
    </PageTopBar>
  );
}

export function ClientDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar title="Client" breadcrumbSegments={[{ label: "Clients", href: "/clients" }]}>
          <div className="p-6">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </PageTopBar>
      }
    >
      <ClientDetailContent />
    </Suspense>
  );
}
