import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "@/router/root.route";
import {
  publicLayoutRoute,
  authenticatedLayoutRoute,
} from "@/router/layout.routes";
import { authRoute, magicLinkVerifyRoute } from "@/router/public.routes";
import {
  indexRoute,
  surveysListRoute,
  surveyRoute,
  vesselsListRoute,
  vesselRoute,
  clientsListRoute,
  clientRoute,
  reportsRoute,
  reportRoute,
  invoicesListRoute,
  invoiceRoute,
  subscriptionsRoute,
  surveyTemplatesListRoute,
  surveyTemplateRoute,
  settingsRoute,
  billingRoute,
  connectOnboardingRoute,
} from "@/router/authenticated.routes";

const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([authRoute, magicLinkVerifyRoute]),
  authenticatedLayoutRoute.addChildren([
    indexRoute,
    surveysListRoute,
    surveyRoute,
    vesselsListRoute,
    vesselRoute,
    clientsListRoute,
    clientRoute,
    reportsRoute,
    reportRoute,
    invoicesListRoute,
    invoiceRoute,
    subscriptionsRoute,
    surveyTemplatesListRoute,
    surveyTemplateRoute,
    settingsRoute,
    billingRoute,
    connectOnboardingRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
