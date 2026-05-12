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
  inboxRoute,
  crmLayoutRoute,
  crmIndexRoute,
  clientsListRoute,
  vesselsListRoute,
  quotesListRoute,
  clientRoute,
  vesselRoute,
  surveysListRoute,
  surveyRoute,
  surveyTemplatesListRoute,
  surveyTemplateRoute,
  moneyLayoutRoute,
  moneyIndexRoute,
  invoicesListRoute,
  subscriptionsRoute,
  invoiceRoute,
  pricingGuideRoute,
  reportsRoute,
  reportRoute,
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
    inboxRoute,
    crmLayoutRoute.addChildren([
      crmIndexRoute,
      clientsListRoute,
      vesselsListRoute,
      quotesListRoute,
    ]),
    clientRoute,
    vesselRoute,
    surveysListRoute,
    surveyRoute,
    surveyTemplatesListRoute,
    surveyTemplateRoute,
    moneyLayoutRoute.addChildren([
      moneyIndexRoute,
      invoicesListRoute,
      subscriptionsRoute,
    ]),
    invoiceRoute,
    pricingGuideRoute,
    reportsRoute,
    reportRoute,
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
