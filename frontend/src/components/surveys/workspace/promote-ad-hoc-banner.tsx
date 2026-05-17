import { Link } from "@tanstack/react-router";

import { useSurveysAdHocSuggestionsListAdHocSuggestions } from "@/openapi/surveys/surveys";
import type { FormNodeRef } from "@/openapi/litestarAPI.schemas";

export function PromoteAdHocBanner({ formNodes }: { formNodes: FormNodeRef[] }) {
  const { data } = useSurveysAdHocSuggestionsListAdHocSuggestions();
  if (!data) return null;

  const adHocLabelsOnThisSurvey = new Set(
    formNodes
      .filter((n) => n.kind === "field" && n.schema_ref == null)
      .map((n) => n.label),
  );

  const matches = data.suggestions.filter((s) =>
    adHocLabelsOnThisSurvey.has(s.label),
  );

  if (matches.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm">
      <div className="font-medium text-amber-900">Add to template?</div>
      <p className="text-xs text-amber-800">
        These ad-hoc fields have shown up on {data.threshold}+ surveys. Promoting them keeps the
        template current.
      </p>
      <ul className="mt-2 space-y-1 text-xs">
        {matches.map((s) => (
          <li key={s.label} className="flex items-center justify-between">
            <span>
              <span className="font-medium">{s.label}</span>{" "}
              <span className="text-amber-700">({s.type}, {s.count}×)</span>
            </span>
            <Link to="/survey-templates" className="text-xs underline">
              Edit templates
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
