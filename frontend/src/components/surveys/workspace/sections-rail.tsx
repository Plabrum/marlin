import { Button } from '@/components/ui/button';
import type { Tree } from './field';
import type { SectionCompletion } from '@/openapi/litestarAPI.schemas';

function statusDot(c?: SectionCompletion): string {
  if (!c || c.total === 0 || c.filled === 0) return 'bg-muted-foreground/40';
  if (c.filled < c.total) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export function SectionsRail({
  sections,
  completion,
  currentSectionId,
  goToSection,
}: {
  sections: Tree[];
  completion: Map<string, SectionCompletion>;
  currentSectionId: string | null;
  goToSection: (sectionId: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden md:block">
      <nav
        aria-label="Sections"
        className="group pointer-events-auto sticky top-20"
      >
        <ul className="group-hover:bg-popover group-hover:ring-border flex flex-col gap-1 rounded-r-xl py-2 pr-2 pl-2 transition-colors group-hover:shadow-md group-hover:ring-1">
          {sections.map((s) => {
            const c = completion.get(s.id);
            const active = currentSectionId === s.id;
            return (
              <li key={s.id}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToSection(s.id)}
                  className={`h-7 w-full justify-start gap-2 px-1 text-xs ${
                    active ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusDot(c)} ${
                      active ? 'ring-primary ring-2 ring-offset-1' : ''
                    }`}
                  />
                  <span className="hidden whitespace-nowrap group-hover:inline">
                    {s.label}
                    {c && (
                      <span className="ml-1 text-[10px] opacity-60">
                        {c.filled}/{c.total}
                      </span>
                    )}
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
