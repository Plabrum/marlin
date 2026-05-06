import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { Skeleton } from "@/components/ui/skeleton";

function SurveyDetailContent() {
  const { surveyId } = useParams({ from: "/_authenticated/surveys/$surveyId" });

  return (
    <PageTopBar
      title="Survey"
      breadcrumbSegments={[{ label: "Surveys", href: "/surveys" }]}
    >
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Survey ID: {surveyId}</p>
      </div>
    </PageTopBar>
  );
}

export function SurveyDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar title="Survey" breadcrumbSegments={[{ label: "Surveys", href: "/surveys" }]}>
          <div className="p-6">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </PageTopBar>
      }
    >
      <SurveyDetailContent />
    </Suspense>
  );
}
