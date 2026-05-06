import { createRoute } from "@tanstack/react-router";
import { authenticatedLayoutRoute } from "@/router/layout.routes";
import { DashboardPage } from "@/pages/dashboard-page";
import { SurveysListPage } from "@/pages/surveys/surveys-list-page";
import { SurveyDetailPage } from "@/pages/surveys/survey-detail-page";
import { VesselsListPage } from "@/pages/vessels/vessels-list-page";
import { VesselDetailPage } from "@/pages/vessels/vessel-detail-page";
import { ClientsListPage } from "@/pages/clients/clients-list-page";
import { ClientDetailPage } from "@/pages/clients/client-detail-page";
import { ReportsPage } from "@/pages/reports/reports-page";
import { SettingsPage } from "@/pages/settings/settings-page";

export const indexRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/",
  component: DashboardPage,
});

export const surveysListRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/surveys",
  component: SurveysListPage,
});

export const surveyRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/surveys/$surveyId",
  params: {
    parse: (p) => ({ surveyId: p.surveyId }),
    stringify: (p) => ({ surveyId: p.surveyId }),
  },
  component: SurveyDetailPage,
});

export const vesselsListRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/vessels",
  component: VesselsListPage,
});

export const vesselRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/vessels/$vesselId",
  params: {
    parse: (p) => ({ vesselId: p.vesselId }),
    stringify: (p) => ({ vesselId: p.vesselId }),
  },
  component: VesselDetailPage,
});

export const clientsListRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/clients",
  component: ClientsListPage,
});

export const clientRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/clients/$clientId",
  params: {
    parse: (p) => ({ clientId: p.clientId }),
    stringify: (p) => ({ clientId: p.clientId }),
  },
  component: ClientDetailPage,
});

export const reportsRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/reports",
  component: ReportsPage,
});

export const settingsRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/settings",
  component: SettingsPage,
});
