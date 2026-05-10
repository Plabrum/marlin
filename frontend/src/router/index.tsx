import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "@/router/root.route";
import {
  publicLayoutRoute,
  authenticatedLayoutRoute,
} from "@/router/layout.routes";
import { authRoute, magicLinkVerifyRoute, galleryRoute } from "@/router/public.routes";
import {
  indexRoute,
  searchRoute,
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

const devRoutes = galleryRoute ? [galleryRoute] : [];

const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([authRoute, magicLinkVerifyRoute, ...devRoutes]),
  authenticatedLayoutRoute.addChildren([
    indexRoute,
    searchRoute,
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
