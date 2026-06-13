import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface DetailSectionProps {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function SectionHeader({
  title,
  icon,
  badge,
  actions,
  trigger,
}: {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  trigger?: boolean;
}) {
  const titleContent = (
    <div className="flex items-center gap-2.5">
      {trigger && (
        <ChevronDown className="text-muted-foreground h-[18px] w-[18px] transition-transform [[data-state=closed]_&]:-rotate-90" />
      )}
      {icon && (
        <div className="text-primary [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {badge != null &&
        (typeof badge === 'object' ? (
          badge
        ) : (
          <span className="bg-muted text-muted-foreground inline-flex items-center justify-center rounded-lg px-2.5 py-0.5 text-[11px] font-semibold">
            {badge}
          </span>
        ))}
    </div>
  );

  return (
    <div className="flex items-center justify-between px-6 pt-[18px] pb-3.5">
      {trigger ? (
        <CollapsibleTrigger className="transition-opacity hover:opacity-70">
          {titleContent}
        </CollapsibleTrigger>
      ) : (
        titleContent
      )}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function DetailSection({
  title,
  icon,
  actions,
  collapsible = true,
  defaultOpen = true,
  badge,
  children,
  className,
}: DetailSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (!collapsible) {
    return (
      <div className={cn('bg-card rounded-2xl border shadow-sm', className)}>
        <SectionHeader
          title={title}
          icon={icon}
          badge={badge}
          actions={actions}
        />
        <div className="border-t px-6 pt-4 pb-5">{children}</div>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn('bg-card rounded-2xl border shadow-sm', className)}>
        <SectionHeader
          title={title}
          icon={icon}
          badge={badge}
          actions={actions}
          trigger
        />
        <CollapsibleContent>
          <div className="border-t px-6 pt-4 pb-5">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
