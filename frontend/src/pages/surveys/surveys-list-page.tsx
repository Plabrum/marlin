import { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { ResourceTable } from "@/components/resource-table/resource-table";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { useResourceTable } from "@/hooks/use-resource-table";
import { useListSurvey } from "@/openapi/survey/survey";
import { surveyColumnDefs } from "@/openapi/survey/columns.gen";

export function SurveysListPage() {
  const navigate = useNavigate();
  const { tableProps } = useResourceTable({ listQuery: useListSurvey, columns: surveyColumnDefs });

  return (
    <PageTopBar
      title="Surveys"
      actions={
        <Suspense>
          <TopLevelActions actionGroup="survey_actions" />
        </Suspense>
      }
    >
      <div className="p-6">
        <ResourceTable
          {...tableProps}
          columns={surveyColumnDefs}
          onRowClick={(row) => navigate({ to: "/surveys/$surveyId", params: { surveyId: String(row.id) } })}
        />
      </div>
    </PageTopBar>
  );
}
