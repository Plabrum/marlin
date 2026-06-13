import { useNavigate, useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

interface TabDefinition {
  label: string;
  path: string;
  badge?: string | number;
}

interface TabLayoutProps {
  tabs: TabDefinition[];
  basePath: string;
  children: React.ReactNode;
  className?: string;
}

export function TabLayout({
  tabs,
  basePath,
  children,
  className,
}: TabLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className={cn(
        'bg-card overflow-hidden rounded-2xl border shadow-sm',
        className
      )}
    >
      <div className="flex h-12 overflow-x-auto border-b" role="tablist">
        {tabs.map((tab) => {
          const href = tab.path ? `${basePath}/${tab.path}` : basePath;
          const isActive = tab.path
            ? location.pathname.startsWith(href)
            : location.pathname === basePath ||
              location.pathname === `${basePath}/`;

          return (
            <button
              key={tab.path}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => navigate({ to: href })}
              className={cn(
                'text-muted-foreground hover:text-foreground flex h-full items-center justify-center gap-1.5 px-4 text-sm font-medium whitespace-nowrap transition-colors',
                isActive &&
                  'border-primary text-primary hover:text-primary border-b-2 font-semibold'
              )}
            >
              {tab.label}
              {tab.badge != null && (
                <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-lg text-[11px] font-semibold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="bg-muted/30 flex flex-col gap-4 p-6">{children}</div>
    </div>
  );
}
