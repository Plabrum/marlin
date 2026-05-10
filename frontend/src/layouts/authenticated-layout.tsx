import { Suspense } from "react";
import { Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuthMeMeSuspense } from "@/openapi/auth/auth";
import { LlmDock } from "@/components/layout/llm-dock";

function AuthenticatedLayoutContent() {
  const { data: user } = useAuthMeMeSuspense();

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "210px",
          "--sidebar-width-icon": "3.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0">
        <div className="flex flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <Suspense>
              <Outlet />
            </Suspense>
          </div>
          <LlmDock />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AuthenticatedLayout() {
  return (
    <Suspense>
      <AuthenticatedLayoutContent />
    </Suspense>
  );
}
