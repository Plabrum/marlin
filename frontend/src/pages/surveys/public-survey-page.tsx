import { Suspense } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { customInstance } from '@/openapi/custom-instance';

type PublicSurveyBlock = {
  type: 'section' | 'field' | 'repeater_instance' | 'finding';
  id: string;
  label?: string | null;
  field_type?: string | null;
  value?: unknown;
  severity?: string | null;
  summary?: string | null;
  detail?: string | null;
  recommended_action?: string | null;
};

type PublicSurveyDetail = {
  id: string;
  identifier: string | null;
  vessel_name: string;
  organization_name: string;
  delivered_at: string;
  blocks: PublicSurveyBlock[];
};

function publicSurveyQuery(accessToken: string) {
  return {
    queryKey: ['public-survey', accessToken] as const,
    queryFn: () =>
      customInstance<PublicSurveyDetail>({
        url: `/public/surveys/${accessToken}`,
        method: 'GET',
      }),
  };
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function SurveyBlock({ block }: { block: PublicSurveyBlock }) {
  if (block.type === 'section') {
    return (
      <h2 className="mt-8 mb-2 text-lg font-semibold first:mt-0">
        {block.label}
      </h2>
    );
  }

  if (block.type === 'field') {
    return (
      <div className="flex justify-between gap-4 border-b py-2 text-sm">
        <span className="text-muted-foreground">{block.label}</span>
        <span className="text-right">{formatValue(block.value)}</span>
      </div>
    );
  }

  if (block.type === 'finding') {
    return (
      <div className="my-3 rounded-lg border p-4 text-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-medium">{block.summary}</span>
          <span className="text-muted-foreground text-xs uppercase">
            {block.severity}
          </span>
        </div>
        {block.detail && (
          <p className="text-muted-foreground">{block.detail}</p>
        )}
        {block.recommended_action && (
          <p className="text-muted-foreground mt-1">
            Recommended: {block.recommended_action}
          </p>
        )}
      </div>
    );
  }

  return null;
}

function PublicSurveyContent() {
  const { accessToken } = useParams({ from: '/_public/survey/$accessToken' });
  const { data: survey } = useSuspenseQuery(publicSurveyQuery(accessToken));

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="bg-card mb-6 rounded-xl border p-6">
        <h1 className="mb-1 text-xl font-semibold">
          Survey {survey.identifier ?? ''}
        </h1>
        <p className="text-muted-foreground text-sm">
          {survey.vessel_name} — {survey.organization_name}
        </p>
      </div>
      <div className="bg-card rounded-xl border p-6">
        {survey.blocks.map((block) => (
          <SurveyBlock key={block.id} block={block} />
        ))}
      </div>
    </div>
  );
}

export function PublicSurveyPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl space-y-4 p-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <PublicSurveyContent />
    </Suspense>
  );
}
