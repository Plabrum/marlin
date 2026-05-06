import { Suspense } from "react";
import { Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuthMeMeSuspense } from "@/openapi/auth/auth";

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
        <main className="flex min-w-0 flex-1 flex-col">
          <Suspense>
            <Outlet />
          </Suspense>
        </main>
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
