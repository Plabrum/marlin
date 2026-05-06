import { Outlet } from "@tanstack/react-router";

export function AuthenticatedLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
}
