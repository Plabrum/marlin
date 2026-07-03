import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useActionExecutor } from '@/hooks/actions/use-action-executor';
import { useDropTarget } from '@/hooks/use-drop-target';
import { AddAdHocFieldButton } from './ad-hoc';
import { DRAG_MEDIA_TYPE, FieldOrRepeater, pad2, type Tree } from './field';
import { AddFindingButton } from './finding-popover';
import type { ActionDTO } from '@/lib/actions/types';
import type {
  SectionCompletion,
  SurveyFormNodeRef,
  SurveyMediaListItem,
} from '@/openapi/litestarAPI.schemas';

const ASSIGN_MEDIA: ActionDTO = {
  action: 'survey_media_actions__assign',
  label: 'Assign media',
};

type SectionDeps = {
  surveyId: string;
  findingsByParent: Map<string, SurveyFormNodeRef[]>;
  mediaByNode: Map<string, SurveyMediaListItem[]>;
  unassignedMedia: SurveyMediaListItem[];
  goToSection: (sectionId: string) => void;
};

export function SectionBlock({
  section,
  sectionIndex,
  totalSections,
  previousSection,
  previousSectionCompletion,
  nextSection,
  nextSectionCompletion,
  completion,
  surveyId,
  findingsByParent,
  mediaByNode,
  unassignedMedia,
  goToSection,
}: {
  section: Tree;
  sectionIndex: number;
  totalSections: number;
  previousSection?: Tree | null;
  previousSectionCompletion?: SectionCompletion | undefined;
  nextSection: Tree | null;
  nextSectionCompletion: SectionCompletion | undefined;
  completion: SectionCompletion | undefined;
} & SectionDeps) {
  const hidden = section.condition_visible === false;
  const [overridden, setOverridden] = useState(false);
  const show = !hidden || overridden;
  const mediaExecutor = useActionExecutor({
    actionGroup: 'survey_media_actions',
  });
  const drop = useDropTarget(DRAG_MEDIA_TYPE, (mediaId) =>
    mediaExecutor.executeAction(
      ASSIGN_MEDIA,
      { action: ASSIGN_MEDIA.action, data: { node_id: section.id } } as never,
      { silent: true, objectId: mediaId }
    )
  );

  const progress = completion
    ? `${pad2(completion.filled)} / ${pad2(completion.total)}`
    : null;

  return (
    <section
      id={`section-${section.id}`}
      className={`section-enter flex min-h-[calc(100vh-3.5rem)] flex-col py-8 ${drop.isOver ? 'ring-ring rounded-sm ring-2' : ''}`}
      onDragOver={drop.onDragOver}
      onDragLeave={drop.onDragLeave}
      onDrop={drop.onDrop}
    >
      {previousSection && (
        <button
          type="button"
          onClick={() => goToSection(previousSection.id)}
          className="mb-6 flex w-full items-baseline gap-3 text-left opacity-50 transition hover:opacity-90"
        >
          <span className="t-kicker shrink-0">
            ← Section {pad2(sectionIndex)} of {pad2(totalSections)}
          </span>
          <span className="text-foreground truncate text-sm font-light">
            {previousSection.label}
          </span>
          {previousSectionCompletion && (
            <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[11px]">
              {pad2(previousSectionCompletion.filled)} /{' '}
              {pad2(previousSectionCompletion.total)}
            </span>
          )}
        </button>
      )}

      <div className="border-border bg-background sticky top-0 z-10 mb-5 flex items-center justify-between gap-3 border-b pt-4 pb-4">
        <div className="flex items-baseline gap-3">
          <span className="t-kicker shrink-0">
            Section {pad2(sectionIndex + 1)} of {pad2(totalSections)}
          </span>
          <h2 className="font-display text-foreground text-[26px] leading-none font-light">
            {section.label}
          </h2>
          {progress && (
            <span className="text-muted-foreground font-mono text-[12px]">
              {progress}
            </span>
          )}
        </div>
        {show && (
          <div className="flex items-center gap-1">
            <AddAdHocFieldButton parentNodeId={section.id} />
            <AddFindingButton parentNodeId={section.id} />
          </div>
        )}
      </div>

      {!show ? (
        <div className="border-border bg-card text-muted-foreground rounded-sm border border-dashed p-4 text-sm">
          Skipped — condition not met.
          <Button
            size="sm"
            variant="link"
            className="ml-2"
            onClick={() => setOverridden(true)}
          >
            Mark as performed
          </Button>
        </div>
      ) : (
        <SectionBody
          section={section}
          surveyId={surveyId}
          findingsByParent={findingsByParent}
          mediaByNode={mediaByNode}
          unassignedMedia={unassignedMedia}
        />
      )}

      {nextSection && (
        <button
          type="button"
          onClick={() => goToSection(nextSection.id)}
          className="mt-8 flex w-full items-baseline gap-3 text-left opacity-50 transition hover:opacity-90"
        >
          <span className="t-kicker shrink-0">
            Section {pad2(sectionIndex + 2)} of {pad2(totalSections)} →
          </span>
          <span className="text-foreground truncate text-sm font-light">
            {nextSection.label}
          </span>
          {nextSectionCompletion && (
            <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[11px]">
              {pad2(nextSectionCompletion.filled)} /{' '}
              {pad2(nextSectionCompletion.total)}
            </span>
          )}
        </button>
      )}
    </section>
  );
}

type FieldDeps = {
  surveyId: string;
  findingsByParent: Map<string, SurveyFormNodeRef[]>;
  mediaByNode: Map<string, SurveyMediaListItem[]>;
  unassignedMedia: SurveyMediaListItem[];
};

function SectionBody({ section, ...deps }: { section: Tree } & FieldDeps) {
  const fieldChildren = section.children.filter((c) => c.kind === 'field');
  return (
    <div className="space-y-4">
      {fieldChildren.map((child, idx) => (
        <FieldOrRepeater
          key={child.id}
          node={child}
          fieldIndex={idx}
          fieldTotal={fieldChildren.length}
          {...deps}
        />
      ))}
    </div>
  );
}
