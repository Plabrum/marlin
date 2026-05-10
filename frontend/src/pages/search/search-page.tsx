import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { searchRoute } from "@/router/authenticated.routes";
import { PageTopBar } from "@/components/layout/page-topbar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useListSurvey } from "@/openapi/survey/survey";
import { useListVessel } from "@/openapi/vessel/vessel";
import { useListClient } from "@/openapi/client/client";
import type { SurveyListItem, VesselListItem, ClientListItem } from "@/openapi/litestarAPI.schemas";

const LIMIT = 5;

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <Badge variant="secondary" className="text-xs">{count}</Badge>
    </div>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground py-2">No {label.toLowerCase()} found.</p>
  );
}

function SurveyResults({ q }: { q: string }) {
  const { data } = useListSurvey({ search: q, limit: LIMIT });
  const items: SurveyListItem[] = data?.items ?? [];

  return (
    <div>
      <SectionHeader label="Surveys" count={data?.total ?? 0} />
      {items.length === 0 ? (
        <EmptySection label="Surveys" />
      ) : (
        <ul className="divide-y divide-border rounded-md border mb-1">
          {items.map((s) => (
            <li key={s.id}>
              <Link
                to="/surveys/$surveyId"
                params={{ surveyId: s.id }}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium">Survey {s.id}</span>
                <span className="text-muted-foreground capitalize">{s.state.replace("_", " ")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/surveys"
        search={{ q }}
        className="text-xs text-primary hover:underline"
      >
        View all results in Surveys →
      </Link>
    </div>
  );
}

function VesselResults({ q }: { q: string }) {
  const { data } = useListVessel({ search: q, limit: LIMIT });
  const items: VesselListItem[] = data?.items ?? [];

  return (
    <div>
      <SectionHeader label="Vessels" count={data?.total ?? 0} />
      {items.length === 0 ? (
        <EmptySection label="Vessels" />
      ) : (
        <ul className="divide-y divide-border rounded-md border mb-1">
          {items.map((v) => (
            <li key={v.id}>
              <Link
                to="/vessels/$vesselId"
                params={{ vesselId: v.id }}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium">{v.name}</span>
                {v.vessel_type && (
                  <span className="text-muted-foreground capitalize">{v.vessel_type.replace("_", " ")}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/vessels"
        search={{ q }}
        className="text-xs text-primary hover:underline"
      >
        View all results in Vessels →
      </Link>
    </div>
  );
}

function ClientResults({ q }: { q: string }) {
  const { data } = useListClient({ search: q, limit: LIMIT });
  const items: ClientListItem[] = data?.items ?? [];

  return (
    <div>
      <SectionHeader label="Clients" count={data?.total ?? 0} />
      {items.length === 0 ? (
        <EmptySection label="Clients" />
      ) : (
        <ul className="divide-y divide-border rounded-md border mb-1">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                to="/clients/$clientId"
                params={{ clientId: c.id }}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium">{c.display_name}</span>
                {c.email && (
                  <span className="text-muted-foreground">{c.email}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/clients"
        search={{ q }}
        className="text-xs text-primary hover:underline"
      >
        View all results in Clients →
      </Link>
    </div>
  );
}

export function SearchPage() {
  const { q: urlQ } = searchRoute.useSearch();
  const navigate = useNavigate({ from: "/search" });

  const [inputValue, setInputValue] = useState(urlQ);

  useEffect(() => {
    setInputValue(urlQ);
  }, [urlQ]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      const timer = setTimeout(() => {
        navigate({ search: { q: val }, replace: true });
      }, 300);
      return () => clearTimeout(timer);
    },
    [navigate],
  );

  const activeQuery = urlQ.trim();

  return (
    <PageTopBar title="Search">
      <div className="p-6 max-w-2xl space-y-6">
        <Input
          autoFocus
          placeholder="Search surveys, vessels, clients…"
          value={inputValue}
          onChange={handleChange}
          className="text-base h-11"
        />

        {activeQuery.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Type to search across surveys, vessels, and clients.
          </p>
        ) : (
          <div className="space-y-6">
            <SurveyResults q={activeQuery} />
            <VesselResults q={activeQuery} />
            <ClientResults q={activeQuery} />
          </div>
        )}
      </div>
    </PageTopBar>
  );
}
