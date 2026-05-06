import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "@/router/root.route";
import {
  publicLayoutRoute,
  authenticatedLayoutRoute,
} from "@/router/layout.routes";
import { authRoute } from "@/router/public.routes";
import { indexRoute } from "@/router/authenticated.routes";

const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([authRoute]),
  authenticatedLayoutRoute.addChildren([indexRoute]),
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
