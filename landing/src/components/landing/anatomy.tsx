import { Plate } from "./plate";
import { SectionLabel } from "./section-label";
import { WorkspaceMock } from "./workspace-mock";

export function Anatomy() {
  return (
    <Plate>
      {/* Header */}
      <div className="mb-12 grid grid-cols-12 gap-x-6 border-b border-paper-edge/70 pb-8">
        <div className="col-span-12 md:col-span-3">
          <SectionLabel numeral="III" title="Plate 01" />
        </div>
        <div className="col-span-12 md:col-span-9">
          <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] font-light leading-[1] tracking-[-0.02em] text-ink">
            Anatomy of{" "}
            <span className="fv-display-italic italic text-brass-deep">
              the workspace.
            </span>
          </h2>
          <p className="mt-4 max-w-2xl font-serif text-[17px] leading-[1.55] text-ink-soft">
            Six fixed regions, each doing one thing well. The document column
            owns the scroll. Everything else — nav, photos, findings, the AI
            surveyor — observes <em className="italic">what section is in view.</em>
          </p>
        </div>
      </div>

      <WorkspaceMock />

      {/* Caption + labels */}
      <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-3">
        <Caption
          label="A · Sticky header"
          text="Breadcrumb, completion percentage, primary action. Stays put while the document scrolls beneath it."
        />
        <Caption
          label="B · The document column"
          text="A 760-pixel column of cards. Sections stack vertically with sticky headers. Snap-scroll on proximity, never on demand."
        />
        <Caption
          label="C · The right rail"
          text="Photos, findings, vessel context, and the AI surveyor. Each panel updates to follow the section in view."
        />
      </div>
    </Plate>
  );
}

function Caption({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-l border-brass/60 pl-4">
      <div className="t-kicker mb-2">{label}</div>
      <p className="font-serif text-[15px] leading-[1.5] text-ink-soft">
        {text}
      </p>
    </div>
  );
}
