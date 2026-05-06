import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { Skeleton } from "@/components/ui/skeleton";

function VesselDetailContent() {
  const { vesselId } = useParams({ from: "/_authenticated/vessels/$vesselId" });

  return (
    <PageTopBar
      title="Vessel"
      breadcrumbSegments={[{ label: "Vessels", href: "/vessels" }]}
    >
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Vessel ID: {vesselId}</p>
      </div>
    </PageTopBar>
  );
}

export function VesselDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar title="Vessel" breadcrumbSegments={[{ label: "Vessels", href: "/vessels" }]}>
          <div className="p-6">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </PageTopBar>
      }
    >
      <VesselDetailContent />
    </Suspense>
  );
}
