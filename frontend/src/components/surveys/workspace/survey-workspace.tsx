import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FieldCard } from "./field-card";
import { AddFindingButton } from "./finding-popover";
import { AddAdHocFieldButton, AddAdHocSectionButton } from "./ad-hoc-buttons";
import { AiSurveyorEntry } from "./ai-surveyor";
import { PromoteAdHocBanner } from "./promote-ad-hoc-banner";
import { CapturePhotoButton } from "./capture-photo-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  useActionsActionGroupExecuteAction,
  useActionsActionGroupObjectIdExecuteObjectAction,
  useActionsActionGroupObjectIdListObjectActions,
} from "@/openapi/actions/actions";
import { useListSurveyMedia } from "@/openapi/survey-media/survey-media";
import type {
  FormNodeRef,
  SectionCompletion,
  SurveyDetail,
  SurveyMediaListItem,
} from "@/openapi/litestarAPI.schemas";

type Tree = FormNodeRef & { children: Tree[] };

type WorkspaceCtx = {
  surveyId: string;
  invalidate: () => Promise<unknown>;
};
const WorkspaceContext = createContext<WorkspaceCtx | null>(null);
function useWorkspace(): WorkspaceCtx {
  const v = useContext(WorkspaceContext);
  if (!v) throw new Error("WorkspaceContext missing");
  return v;
}

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-sky-500",
  advisory: "bg-amber-500",
  critical: "bg-red-600",
};

const SEVERITY_TEXT: Record<string, string> = {
  info: "text-sky-700",
  advisory: "text-amber-700",
  critical: "text-red-700",
};

function buildTree(nodes: FormNodeRef[]): Tree[] {
  const byId = new Map<string, Tree>();
  for (const n of nodes) byId.set(n.id, { ...n, children: [] });
  const roots: Tree[] = [];
  for (const n of byId.values()) {
    if (n.parent_id && byId.has(n.parent_id)) {
      byId.get(n.parent_id)!.children.push(n);
    } else {
      roots.push(n);
    }
  }
  const sortRec = (t: Tree) => {
    t.children.sort((a, b) => a.sort_order - b.sort_order);
    t.children.forEach(sortRec);
  };
  roots.sort((a, b) => a.sort_order - b.sort_order);
  roots.forEach(sortRec);
  return roots;
}

function statusDot(c?: SectionCompletion): string {
  if (!c || c.total === 0) return "bg-gray-300";
  if (c.filled === 0) return "bg-gray-300";
  if (c.filled < c.total) return "bg-amber-500";
  return "bg-emerald-500";
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

function formatAgo(deltaMs: number): string {
  const s = Math.max(0, Math.floor(deltaMs / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

const DRAG_MEDIA_TYPE = "application/x-sloopquest-media-id";

function useNodeDropTarget(
  nodeId: string,
  onAssign: (mediaId: string, nodeId: string | null) => Promise<void>,
) {
  const [over, setOver] = useState(false);
  return {
    isOver: over,
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(DRAG_MEDIA_TYPE)) {
        e.preventDefault();
        setOver(true);
      }
    },
    onDragLeave: () => setOver(false),
    onDrop: async (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const mediaId = e.dataTransfer.getData(DRAG_MEDIA_TYPE);
      if (mediaId) await onAssign(mediaId, nodeId);
    },
  };
}

function jumpToHash(hash: string) {
  if (typeof window === "undefined") return;
  const el = document.getElementById(hash.replace(/^#/, ""));
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function SurveyWorkspace({ data }: { data: SurveyDetail }) {
  const tree = useMemo(() => buildTree(data.form_nodes), [data.form_nodes]);
  const completion = useMemo(
    () => new Map(data.section_completion.map((c) => [c.section_id, c])),
    [data.section_completion],
  );
  const [savingNodeId, setSavingNodeId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const execute = useActionsActionGroupObjectIdExecuteObjectAction();
  const assignMedia = useActionsActionGroupObjectIdExecuteObjectAction();

  const invalidateSurvey = useCallback(
    () =>
      queryClient.invalidateQueries({
        predicate: (q) =>
          String(q.queryKey[0] ?? "").startsWith(`/surveys/${data.id}`) ||
          String(q.queryKey[0] ?? "").startsWith("/survey-media"),
      }),
    [data.id, queryClient],
  );

  const handleSave = useCallback(
    async (node: FormNodeRef, value: unknown) => {
      setSavingNodeId(node.id);
      setSaveError(null);
      try {
        await execute.mutateAsync({
          actionGroup: "form_node_actions",
          objectId: node.id,
          data: { action: "form_node_actions__update_value", data: { value } } as never,
        });
        setLastSavedAt(Date.now());
        await invalidateSurvey();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSavingNodeId(null);
      }
    },
    [execute, invalidateSurvey],
  );

  const handleAssignMedia = useCallback(
    async (mediaId: string, nodeId: string | null) => {
      await assignMedia.mutateAsync({
        actionGroup: "survey_media_actions",
        objectId: mediaId,
        data: {
          action: "survey_media_actions__assign",
          data: { node_id: nodeId },
        } as never,
      });
      await invalidateSurvey();
    },
    [assignMedia, invalidateSurvey],
  );

  const topLevelFields = tree.filter((n) => n.kind === "field");
  const sections = tree.filter((n) => n.kind === "section");
  const findings = useMemo(
    () =>
      data.form_nodes.filter(
        (n) =>
          n.kind === "annotation" &&
          (n.value as { type?: string } | null)?.type === "finding",
      ),
    [data.form_nodes],
  );
  const findingsByParent = useMemo(() => {
    const m = new Map<string, FormNodeRef[]>();
    for (const f of findings) {
      if (!f.parent_id) continue;
      const list = m.get(f.parent_id) ?? [];
      list.push(f);
      m.set(f.parent_id, list);
    }
    return m;
  }, [findings]);

  const sectionAncestor = useMemo(() => {
    const parentOf = new Map<string, string | null>();
    for (const n of data.form_nodes) parentOf.set(n.id, n.parent_id ?? null);
    const result = new Map<string, string>();
    for (const n of data.form_nodes) {
      let cur: string | null = n.id;
      while (cur) {
        const node = data.form_nodes.find((x) => x.id === cur);
        if (node?.kind === "section") {
          result.set(n.id, node.id);
          break;
        }
        cur = parentOf.get(cur) ?? null;
      }
    }
    return result;
  }, [data.form_nodes]);

  const totalFilled = data.section_completion.reduce((s, c) => s + c.filled, 0);
  const totalAll = data.section_completion.reduce((s, c) => s + c.total, 0);
  const pct = totalAll === 0 ? 0 : Math.round((totalFilled / totalAll) * 100);

  useScrollPersist(sections.map((s) => s.id));

  const { data: mediaPage } = useListSurveyMedia({
    filters: [{ type: "text", column: "survey_id", operation: "equals", value: data.id }],
    limit: 100,
    offset: 0,
  });
  const mediaItems = mediaPage?.items ?? [];
  const unassignedMedia = mediaItems.filter((m) => !m.node_id);

  return (
    <WorkspaceContext.Provider value={{ surveyId: data.id, invalidate: invalidateSurvey }}>
    <div className="bg-muted/30">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3 text-sm">
          <PeekToc sections={sections} completion={completion} />
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link to="/surveys" className="hover:underline">Surveys</Link>
            <span>/</span>
            <span className="text-foreground">{data.vessel.label}</span>
          </nav>
          <Badge variant="outline">{data.state}</Badge>
          <span className="text-muted-foreground">
            {pct}% · {totalFilled}/{totalAll}
          </span>
          <SavedIndicator
            savingNodeId={savingNodeId}
            lastSavedAt={lastSavedAt}
            error={saveError}
          />
        </div>
        <GenerateReportButton surveyId={data.id} onMutate={invalidateSurvey} />
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-[1fr_320px]">
        <main className="space-y-6">
          {topLevelFields.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold">Survey info</h2>
              {topLevelFields.map((node) => (
                <FieldWithExtras
                  key={node.id}
                  node={node}
                  findings={findingsByParent.get(node.id) ?? []}
                  unassignedMedia={unassignedMedia}
                  onSave={handleSave}
                  onAssign={handleAssignMedia}
                  isSaving={savingNodeId === node.id}
                />
              ))}
            </section>
          )}

          {sections.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              completion={completion.get(section.id)}
              findingsByParent={findingsByParent}
              unassignedMedia={unassignedMedia}
              onSave={handleSave}
              onAssign={handleAssignMedia}
              savingNodeId={savingNodeId}
              onMutate={invalidateSurvey}
            />
          ))}

          <AddAdHocSectionButton ownerType="surveys" ownerId={data.id} onAdded={invalidateSurvey} />
        </main>

        <aside className="hidden sticky top-16 self-start space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto md:block">
          <PhotosRail
            items={mediaItems}
            unassigned={unassignedMedia}
          />
          <VesselCard data={data} />
          <FindingsList
            findings={findings}
            sectionAncestor={sectionAncestor}
          />
          <PromoteAdHocBanner formNodes={data.form_nodes} />
          <AiSurveyorEntry />
        </aside>
      </div>

      <MobileRail
        mediaItems={mediaItems}
        unassignedMedia={unassignedMedia}
        data={data}
        findings={findings}
        sectionAncestor={sectionAncestor}
      />
    </div>
    </WorkspaceContext.Provider>
  );
}

function SavedIndicator({
  savingNodeId,
  lastSavedAt,
  error,
}: {
  savingNodeId: string | null;
  lastSavedAt: number | null;
  error: string | null;
}) {
  const now = useNow(15_000);
  if (error) {
    return <span className="text-xs text-red-600">Save failed — retry?</span>;
  }
  if (savingNodeId) {
    return <span className="text-xs text-muted-foreground">Saving…</span>;
  }
  if (!lastSavedAt) return null;
  return (
    <span className="text-xs text-muted-foreground">
      Saved {formatAgo(now - lastSavedAt)}
    </span>
  );
}

function GenerateReportButton({
  surveyId,
  onMutate,
}: {
  surveyId: string;
  onMutate: () => Promise<unknown>;
}) {
  const { data } = useActionsActionGroupObjectIdListObjectActions("survey_actions", surveyId);
  const execute = useActionsActionGroupObjectIdExecuteObjectAction();
  const deliver = (data?.actions ?? []).find(
    (a) => a.action === "survey_actions__deliver" && a.available !== false,
  );

  if (!deliver) {
    return (
      <Button size="sm" disabled>
        Generate report
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={async () => {
        await execute.mutateAsync({
          actionGroup: "survey_actions",
          objectId: surveyId,
          data: { action: "survey_actions__deliver", data: {} } as never,
        });
        await onMutate();
      }}
      disabled={execute.isPending}
    >
      Generate report
    </Button>
  );
}

function useScrollPersist(sectionIds: string[]) {
  useEffect(() => {
    if (sectionIds.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          const id = visible.target.id;
          if (id && window.location.hash !== `#${id}`) {
            history.replaceState(null, "", `#${id}`);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );
    for (const id of sectionIds) {
      const el = document.getElementById(`section-${id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sectionIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) {
      const target = window.location.hash;
      requestAnimationFrame(() => jumpToHash(target));
    }
  }, []);
}

function PeekToc({
  sections,
  completion,
}: {
  sections: Tree[];
  completion: Map<string, SectionCompletion>;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="ghost">☰</Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>Sections</SheetTitle>
        </SheetHeader>
        <ul className="mt-4 space-y-1 text-sm">
          {sections.map((s) => {
            const c = completion.get(s.id);
            return (
              <li key={s.id}>
                <a
                  href={`#section-${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    jumpToHash(`section-${s.id}`);
                  }}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted"
                >
                  <span className={`inline-block h-2 w-2 rounded-full ${statusDot(c)}`} />
                  <span className="flex-1">{s.label}</span>
                  {c && <span className="text-xs text-muted-foreground">{c.filled}/{c.total}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

function SectionBlock({
  section,
  completion,
  findingsByParent,
  unassignedMedia,
  onSave,
  onAssign,
  savingNodeId,
  onMutate,
}: {
  section: Tree;
  completion: SectionCompletion | undefined;
  findingsByParent: Map<string, FormNodeRef[]>;
  unassignedMedia: SurveyMediaListItem[];
  onSave: (node: FormNodeRef, value: unknown) => Promise<void>;
  onAssign: (mediaId: string, nodeId: string | null) => Promise<void>;
  savingNodeId: string | null;
  onMutate: () => Promise<unknown>;
}) {
  const hidden = section.condition_visible === false;
  const [overridden, setOverridden] = useState(false);
  const show = !hidden || overridden;
  const drop = useNodeDropTarget(section.id, onAssign);
  const { surveyId, invalidate } = useWorkspace();

  return (
    <section
      id={`section-${section.id}`}
      className={`scroll-mt-20 space-y-3 ${drop.isOver ? "ring-2 ring-primary rounded-xl" : ""}`}
      onDragOver={drop.onDragOver}
      onDragLeave={drop.onDragLeave}
      onDrop={drop.onDrop}
    >
      <div className="sticky top-14 z-10 flex items-center justify-between rounded-xl border bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div>
          <h2 className="text-base font-semibold">{section.label}</h2>
          {completion && (
            <p className="text-xs text-muted-foreground">
              {completion.filled}/{completion.total} filled
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <CapturePhotoButton
            surveyId={surveyId}
            nodeId={section.id}
            mode="camera"
            size="xs"
            onUploaded={invalidate}
          />
          <CapturePhotoButton
            surveyId={surveyId}
            nodeId={section.id}
            mode="library"
            size="xs"
            onUploaded={invalidate}
          />
          <AttachPhotoButton
            nodeId={section.id}
            unassignedMedia={unassignedMedia}
            onAssign={onAssign}
          />
          {show && (
            <AddFindingButton
              parentNodeId={section.id}
              unassignedMedia={unassignedMedia}
              onAdded={onMutate}
            />
          )}
        </div>
      </div>

      {!show ? (
        <div className="rounded-2xl border border-dashed bg-white p-4 text-sm text-muted-foreground">
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
          findingsByParent={findingsByParent}
          unassignedMedia={unassignedMedia}
          onSave={onSave}
          onAssign={onAssign}
          savingNodeId={savingNodeId}
          onMutate={onMutate}
        />
      )}
    </section>
  );
}

function SectionBody({
  section,
  findingsByParent,
  unassignedMedia,
  onSave,
  onAssign,
  savingNodeId,
  onMutate,
}: {
  section: Tree;
  findingsByParent: Map<string, FormNodeRef[]>;
  unassignedMedia: SurveyMediaListItem[];
  onSave: (node: FormNodeRef, value: unknown) => Promise<void>;
  onAssign: (mediaId: string, nodeId: string | null) => Promise<void>;
  savingNodeId: string | null;
  onMutate: () => Promise<unknown>;
}) {
  return (
    <div className="space-y-4">
      {section.children.map((child) => {
        if (child.kind === "subsection") {
          return (
            <SubsectionBlock
              key={child.id}
              subsection={child}
              findingsByParent={findingsByParent}
              unassignedMedia={unassignedMedia}
              onSave={onSave}
              onAssign={onAssign}
              savingNodeId={savingNodeId}
              onMutate={onMutate}
            />
          );
        }
        if (child.kind === "field") {
          return (
            <FieldOrRepeater
              key={child.id}
              node={child}
              findingsByParent={findingsByParent}
              unassignedMedia={unassignedMedia}
              onSave={onSave}
              onAssign={onAssign}
              savingNodeId={savingNodeId}
              onMutate={onMutate}
            />
          );
        }
        return null;
      })}
      <AddAdHocFieldButton parentNodeId={section.id} onAdded={onMutate} />
    </div>
  );
}

function SubsectionBlock({
  subsection,
  findingsByParent,
  unassignedMedia,
  onSave,
  onAssign,
  savingNodeId,
  onMutate,
}: {
  subsection: Tree;
  findingsByParent: Map<string, FormNodeRef[]>;
  unassignedMedia: SurveyMediaListItem[];
  onSave: (node: FormNodeRef, value: unknown) => Promise<void>;
  onAssign: (mediaId: string, nodeId: string | null) => Promise<void>;
  savingNodeId: string | null;
  onMutate: () => Promise<unknown>;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{subsection.label}</h3>
      {subsection.children
        .filter((n) => n.kind === "field")
        .map((node) => (
          <FieldOrRepeater
            key={node.id}
            node={node}
            findingsByParent={findingsByParent}
            unassignedMedia={unassignedMedia}
            onSave={onSave}
            onAssign={onAssign}
            savingNodeId={savingNodeId}
            onMutate={onMutate}
          />
        ))}
      <AddAdHocFieldButton parentNodeId={subsection.id} onAdded={onMutate} />
    </div>
  );
}

function FieldOrRepeater({
  node,
  findingsByParent,
  unassignedMedia,
  onSave,
  onAssign,
  savingNodeId,
  onMutate,
}: {
  node: Tree;
  findingsByParent: Map<string, FormNodeRef[]>;
  unassignedMedia: SurveyMediaListItem[];
  onSave: (node: FormNodeRef, value: unknown) => Promise<void>;
  onAssign: (mediaId: string, nodeId: string | null) => Promise<void>;
  savingNodeId: string | null;
  onMutate: () => Promise<unknown>;
}) {
  const isRepeater = (node.config as { type?: string } | null)?.type === "repeater";
  const execute = useActionsActionGroupObjectIdExecuteObjectAction();

  if (!isRepeater) {
    return (
      <FieldWithExtras
        node={node}
        findings={findingsByParent.get(node.id) ?? []}
        unassignedMedia={unassignedMedia}
        onSave={onSave}
        onAssign={onAssign}
        isSaving={savingNodeId === node.id}
      />
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{node.label}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await execute.mutateAsync({
              actionGroup: "form_node_actions",
              objectId: node.id,
              data: { action: "form_node_actions__add_repeater_instance", data: {} } as never,
            });
            await onMutate();
          }}
        >
          + Add another
        </Button>
      </div>
      {node.children
        .filter((c) => c.kind === "repeater_instance")
        .map((instance) => (
          <RepeaterInstance
            key={instance.id}
            instance={instance}
            findingsByParent={findingsByParent}
            unassignedMedia={unassignedMedia}
            onSave={onSave}
            onAssign={onAssign}
            savingNodeId={savingNodeId}
            onMutate={onMutate}
          />
        ))}
    </div>
  );
}

function RepeaterInstance({
  instance,
  findingsByParent,
  unassignedMedia,
  onSave,
  onAssign,
  savingNodeId,
  onMutate,
}: {
  instance: Tree;
  findingsByParent: Map<string, FormNodeRef[]>;
  unassignedMedia: SurveyMediaListItem[];
  onSave: (node: FormNodeRef, value: unknown) => Promise<void>;
  onAssign: (mediaId: string, nodeId: string | null) => Promise<void>;
  savingNodeId: string | null;
  onMutate: () => Promise<unknown>;
}) {
  const remove = useActionsActionGroupObjectIdExecuteObjectAction();
  return (
    <div className="space-y-2 rounded-xl bg-muted/40 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{instance.label}</div>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-muted-foreground"
          onClick={async () => {
            await remove.mutateAsync({
              actionGroup: "form_node_actions",
              objectId: instance.id,
              data: { action: "form_node_actions__delete", data: {} } as never,
            });
            await onMutate();
          }}
        >
          Remove
        </Button>
      </div>
      {instance.children
        .filter((c) => c.kind === "field")
        .map((child) => (
          <FieldWithExtras
            key={child.id}
            node={child}
            findings={findingsByParent.get(child.id) ?? []}
            unassignedMedia={unassignedMedia}
            onSave={onSave}
            onAssign={onAssign}
            isSaving={savingNodeId === child.id}
          />
        ))}
    </div>
  );
}

function FieldWithExtras({
  node,
  findings,
  unassignedMedia,
  onSave,
  onAssign,
  isSaving,
}: {
  node: FormNodeRef;
  findings: FormNodeRef[];
  unassignedMedia: SurveyMediaListItem[];
  onSave: (node: FormNodeRef, value: unknown) => Promise<void>;
  onAssign: (mediaId: string, nodeId: string | null) => Promise<void>;
  isSaving: boolean;
}) {
  const { surveyId, invalidate } = useWorkspace();
  const drop = useNodeDropTarget(node.id, onAssign);
  return (
    <div
      className={`space-y-2 rounded-2xl transition-shadow ${drop.isOver ? "ring-2 ring-primary" : ""}`}
      onDragOver={drop.onDragOver}
      onDragLeave={drop.onDragLeave}
      onDrop={drop.onDrop}
    >
      <FieldCard
        node={node}
        onSave={(value) => onSave(node, value)}
        isSaving={isSaving}
      />
      {findings.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-1">
          {findings.map((f) => {
            const v = f.value as { severity?: string; summary?: string } | null;
            const sev = v?.severity ?? "info";
            return (
              <span
                key={f.id}
                className={`inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-xs ${
                  SEVERITY_TEXT[sev] ?? ""
                }`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[sev] ?? "bg-gray-400"}`} />
                {v?.summary ?? f.label}
              </span>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-1 pl-1">
        <CapturePhotoButton
          surveyId={surveyId}
          nodeId={node.id}
          mode="camera"
          size="xs"
          onUploaded={invalidate}
        />
        <CapturePhotoButton
          surveyId={surveyId}
          nodeId={node.id}
          mode="library"
          size="xs"
          onUploaded={invalidate}
        />
        <AttachPhotoButton
          nodeId={node.id}
          unassignedMedia={unassignedMedia}
          onAssign={onAssign}
          size="xs"
        />
      </div>
    </div>
  );
}

function AttachPhotoButton({
  nodeId,
  unassignedMedia,
  onAssign,
  size = "sm",
}: {
  nodeId: string;
  unassignedMedia: SurveyMediaListItem[];
  onAssign: (mediaId: string, nodeId: string | null) => Promise<void>;
  size?: "sm" | "xs";
}) {
  const [open, setOpen] = useState(false);
  if (unassignedMedia.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className={size === "xs" ? "h-6 px-2 text-xs text-muted-foreground" : "text-xs"}
        >
          📷 Attach ({unassignedMedia.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="mb-2 text-xs font-medium">From Unassigned</div>
        <div className="grid max-h-64 grid-cols-4 gap-1 overflow-y-auto">
          {unassignedMedia.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={async () => {
                await onAssign(m.id, nodeId);
              }}
              className="aspect-square overflow-hidden rounded border hover:ring-2 hover:ring-primary"
            >
              <img
                src={m.thumbnail_url ?? m.view_url}
                alt={m.caption ?? ""}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PhotosRail({
  items,
  unassigned,
}: {
  items: SurveyMediaListItem[];
  unassigned: SurveyMediaListItem[];
}) {
  return (
    <div className="space-y-2 rounded-2xl border bg-white p-3">
      <div className="text-sm font-medium">Photos ({items.length})</div>
      {unassigned.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-orange-600">Unassigned ({unassigned.length})</div>
          <div className="grid grid-cols-3 gap-1">
            {unassigned.slice(0, 12).map((m) => (
              <DraggablePhoto key={m.id} media={m} />
            ))}
          </div>
        </div>
      )}
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">No photos yet.</p>
      )}
    </div>
  );
}

function DraggablePhoto({ media }: { media: SurveyMediaListItem }) {
  return (
    <img
      src={media.thumbnail_url ?? media.view_url}
      alt={media.caption ?? ""}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MEDIA_TYPE, media.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="aspect-square cursor-grab rounded border border-dashed border-orange-400 object-cover active:cursor-grabbing"
    />
  );
}

function VesselCard({ data }: { data: SurveyDetail }) {
  return (
    <div className="space-y-1 rounded-2xl border bg-white p-3 text-sm">
      <div className="font-medium">Vessel</div>
      <Link to={data.vessel.href} className="text-primary hover:underline">
        {data.vessel.label}
      </Link>
    </div>
  );
}

function FindingsList({
  findings,
  sectionAncestor,
}: {
  findings: FormNodeRef[];
  sectionAncestor: Map<string, string>;
}) {
  const sorted = useMemo(() => {
    const severityRank: Record<string, number> = {
      critical: 0,
      advisory: 1,
      info: 2,
    };
    return [...findings].sort((a, b) => {
      const av = a.value as { severity?: string } | null;
      const bv = b.value as { severity?: string } | null;
      return (severityRank[av?.severity ?? "info"] ?? 3) - (severityRank[bv?.severity ?? "info"] ?? 3);
    });
  }, [findings]);

  return (
    <div className="space-y-2 rounded-2xl border bg-white p-3">
      <div className="text-sm font-medium">Findings ({findings.length})</div>
      {findings.length === 0 && (
        <p className="text-xs text-muted-foreground">None yet.</p>
      )}
      <ul className="space-y-1">
        {sorted.map((f) => {
          const v = f.value as { severity?: string; summary?: string } | null;
          const sev = v?.severity ?? "info";
          const sectionId = f.parent_id ? sectionAncestor.get(f.parent_id) ?? f.parent_id : null;
          return (
            <li key={f.id} className="text-xs">
              <button
                type="button"
                onClick={() => sectionId && jumpToHash(`section-${sectionId}`)}
                className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-muted"
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[sev] ?? "bg-gray-400"}`} />
                <span className={SEVERITY_TEXT[sev] ?? ""}>
                  {v?.summary ?? f.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MobileRail({
  mediaItems,
  unassignedMedia,
  data,
  findings,
  sectionAncestor,
}: {
  mediaItems: SurveyMediaListItem[];
  unassignedMedia: SurveyMediaListItem[];
  data: SurveyDetail;
  findings: FormNodeRef[];
  sectionAncestor: Map<string, string>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            size="sm"
            className="fixed bottom-4 right-4 z-30 rounded-full shadow-lg md:hidden"
          >
            Rail
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh] p-0">
          <SheetHeader className="border-b px-4 py-2">
            <SheetTitle className="text-sm">Survey rail</SheetTitle>
          </SheetHeader>
          <Tabs defaultValue="photos" className="flex h-full flex-col">
            <TabsList className="mx-2 mt-2 grid grid-cols-3">
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="findings">Findings</TabsTrigger>
              <TabsTrigger value="vessel">Vessel</TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-y-auto p-3">
              <TabsContent value="photos" className="space-y-3">
                <PhotosRail items={mediaItems} unassigned={unassignedMedia} />
              </TabsContent>
              <TabsContent value="findings" className="space-y-3">
                <FindingsList findings={findings} sectionAncestor={sectionAncestor} />
              </TabsContent>
              <TabsContent value="vessel" className="space-y-3">
                <VesselCard data={data} />
                <PromoteAdHocBanner formNodes={data.form_nodes} />
                <AiSurveyorEntry />
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
