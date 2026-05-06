import { createRoute } from "@tanstack/react-router";
import { publicLayoutRoute } from "@/router/layout.routes";
import { AuthPage } from "@/pages/auth-page";

export const authRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: "/auth",
  validateSearch: (
    search: Record<string, unknown>,
  ): { reason?: "session-expired" } =>
    search["reason"] === "session-expired"
      ? { reason: "session-expired" }
      : {},
  component: AuthPage,
});
