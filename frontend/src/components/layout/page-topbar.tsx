import { Suspense } from 'react';
import { Link } from '@tanstack/react-router';
import { StatusBadge } from '@/components/status-badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useBreadcrumbs } from '@/lib/use-breadcrumbs';
import { usePageSubcrumb } from '@/stores/page-subcrumb';

interface PageTopBarProps {
  title?: string;
  state?: string | null;
  actions?: React.ReactNode;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PageTopBar({
  state,
  actions,
  fallback,
  children,
}: PageTopBarProps) {
  const trail = useBreadcrumbs();
  const subcrumb = usePageSubcrumb((s) => s.label);

  const head = trail.slice(0, -1);
  const current = trail[trail.length - 1];

  return (
    <>
      <header className="border-sidebar-border bg-sidebar sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="text-sidebar-foreground/50 hover:text-sidebar-foreground -ml-1" />
          <Breadcrumb>
            <BreadcrumbList>
              {head.map((segment) => (
                <span key={segment.url} className="contents">
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={segment.url}>{segment.label}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>/</BreadcrumbSeparator>
                </span>
              ))}
              {current ? (
                <BreadcrumbItem>
                  <BreadcrumbPage>{current.label}</BreadcrumbPage>
                </BreadcrumbItem>
              ) : null}
              {subcrumb ? (
                <>
                  <BreadcrumbSeparator>/</BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <span data-slot="breadcrumb-subcrumb" aria-current="page">
                      {subcrumb}
                    </span>
                  </BreadcrumbItem>
                </>
              ) : null}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-3">
          {state ? <StatusBadge status={state} tone="subtle" /> : null}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>
      <Suspense fallback={fallback ?? <PageSkeleton />}>{children}</Suspense>
    </>
  );
}
