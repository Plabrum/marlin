import { Link } from '@tanstack/react-router';
import { RailSection } from './rail-section';
import type { SurveyDetail } from '@/openapi/litestarAPI.schemas';

export function VesselCard({ data }: { data: SurveyDetail }) {
  const rows: { k: string; v: string; href?: string }[] = [
    { k: 'Vessel', v: data.vessel.label, href: data.vessel.href },
    { k: 'Surveyor', v: data.surveyor.label, href: data.surveyor.href },
  ];

  return (
    <RailSection label="Vessel">
      <dl className="text-foreground space-y-1.5 font-mono text-[11px] tracking-[0.14em] uppercase">
        {rows.map((r) => (
          <div key={r.k} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">{r.k}</dt>
            <dd className="text-foreground min-w-0 truncate">
              {r.href ? (
                <Link
                  to={r.href}
                  className="link-rule tracking-normal normal-case"
                >
                  {r.v}
                </Link>
              ) : (
                r.v
              )}
            </dd>
          </div>
        ))}
      </dl>
    </RailSection>
  );
}
