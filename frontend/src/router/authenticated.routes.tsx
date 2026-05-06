import { createRoute } from "@tanstack/react-router";
import { authenticatedLayoutRoute } from "@/router/layout.routes";
import { DashboardPage } from "@/pages/dashboard-page";

export const indexRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/",
  component: DashboardPage,
});
