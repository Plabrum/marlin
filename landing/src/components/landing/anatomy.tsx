import { Plate } from "./plate";
import { SectionLabel } from "./section-label";
import { WorkspaceMock } from "./workspace-mock";

export function Anatomy() {
  return (
    <Plate id="workspace">
      {/* Header */}
      <div className="mb-12 flex flex-col gap-6 border-b border-paper-edge/70 pb-8 md:mb-16 md:flex-row md:items-end md:justify-between">
        <div>
          <SectionLabel numeral="IV" title="Plate 01" className="mb-3" />
          <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] font-light leading-[1] tracking-[-0.02em] text-ink">
            The{" "}
            <span className="fv-display-italic italic text-brass-deep">
              workspace.
            </span>
          </h2>
        </div>
        <p className="max-w-md font-serif text-[16px] italic leading-[1.5] text-ink-soft">
          Build your report with AI assistance, straight from the findings
          you capture in the field.
        </p>
      </div>

      <WorkspaceMock />

      {/* Caption + labels */}
      <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-3">
        <Caption
          label="A · Custom survey templates"
          text="Build the checklist once for pre-purchase, insurance, damage, or condition & value, then reuse it on every hull. Sections, fields, and required findings match the way you actually work."
        />
        <Caption
          label="B · Single document view"
          text="The whole survey in one scrollable column, system by system. No tabs, no modals, no hunting for the page you were on when the owner walked up."
        />
        <Caption
          label="C · Easy photo management"
          text="Shoot from your phone, drop straight onto the finding. Every photo stays attached to the finding it documents. No folder of 400 untitled JPEGs to sort later."
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
