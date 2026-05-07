import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { KeyValueGrid } from "@/components/layout/key-value-grid";
import { ActionsMenu } from "@/components/actions-menu";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useSurveysIdDetailHandlerSuspense } from "@/openapi/survey/survey";
import { useActionsActionGroupObjectIdListObjectActions } from "@/openapi/actions/actions";

function SurveyDetailContent() {
  const { surveyId } = useParams({ from: "/_authenticated/surveys/$surveyId" });
  const { data } = useSurveysIdDetailHandlerSuspense(surveyId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions("survey_actions", surveyId);

  return (
    <PageTopBar
      title={`Survey — ${data.survey_type}`}
      breadcrumbSegments={[{ label: "Surveys", href: "/surveys" }]}
      actions={
        <div className="flex items-center gap-2">
          <TopLevelActions
            actionGroup="invoice_actions"
            formContext={{ survey_id: surveyId }}
            maxVisible={1}
          />
          <ActionsMenu
            actions={actionsData?.actions ?? []}
            actionGroup="survey_actions"
            objectId={surveyId}
            objectData={data}
            onActionComplete={() => refetchActions()}
          />
        </div>
      }
    >
      <div className="p-6">
        <KeyValueGrid
          items={[
            { label: "Survey Type", value: data.survey_type },
            { label: "State", value: data.state },
            { label: "Vessel ID", value: data.vessel_id },
            { label: "Surveyor ID", value: data.assigned_surveyor_id },
            { label: "Scheduled For", value: data.scheduled_for ?? "—" },
            { label: "Weather", value: data.weather_conditions ?? "—" },
            { label: "Vessel State", value: data.vessel_state_at_inspection ?? "—" },
            { label: "Sea Trial", value: data.included_sea_trial ? "Yes" : "No" },
            { label: "Haul Out", value: data.included_haul_out ? "Yes" : "No" },
            {
              label: "Quoted Fee",
              value: data.quoted_fee_cents != null
                ? `$${(data.quoted_fee_cents / 100).toFixed(2)}`
                : "—",
            },
          ]}
        />
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
