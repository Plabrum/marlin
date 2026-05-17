import { Plate } from "./plate";
import { SectionLabel } from "./section-label";

type Pillar = {
  numeral: string;
  kicker: string;
  title: string;
  italicWord: string;
  body: string;
  bullets: string[];
};

const pillars: Pillar[] = [
  {
    numeral: "I",
    kicker: "On the dock",
    title: "A capture surface for",
    italicWord: "the working surveyor.",
    body: "Photos go to the field they describe. Findings attach to the section they belong to. Auto-save fires on every blur. Built for tablets, gloves, salt spray, and a flashlight in one hand.",
    bullets: [
      "Per-field photo capture",
      "Inline findings (info · advisory · critical)",
      "Sticky section headers, snap-scroll",
      "Touch-first, offline-capable¹",
    ],
  },
  {
    numeral: "II",
    kicker: "Through the survey",
    title: "A document model that",
    italicWord: "respects the work.",
    body: "Sections, subsections, repeaters, conditional logic. Surveyors deviate from a template without forking it. When a useful addition repeats across N surveys, promote it back to the template — never silently lose a field.",
    bullets: [
      "Section / field / repeater hierarchy",
      "Conditional rendering at runtime",
      "Per-survey overrides, promotable",
      "Versioned templates",
    ],
  },
  {
    numeral: "III",
    kicker: "Off to the client",
    title: "A report that ships",
    italicWord: "the same day.",
    body: "Polished PDFs in your house style. Findings indexed by severity, photos placed beside their captions, recommendations triaged. Same-day turnaround stops being aspirational and starts being the default.",
    bullets: [
      "Branded PDF, HTML, JSON output",
      "Severity-sorted finding index",
      "Photo-to-caption auto-placement",
      "Client portal handoff",
    ],
  },
];

export function Pillars() {
  return (
    <Plate tone="warm">
      {/* Section header */}
      <div className="mb-14 flex items-end justify-between gap-6 border-b border-paper-edge/70 pb-6 md:mb-20">
        <div>
          <SectionLabel numeral="II" title="Three Acts" className="mb-3" />
          <h2 className="fv-display-soft font-display text-[clamp(2.4rem,5.4vw,4.4rem)] font-light leading-[0.98] tracking-[-0.02em] text-ink">
            The arc of a survey,
            <br />
            <span className="fv-display-italic italic text-ink-soft">
              in three movements.
            </span>
          </h2>
        </div>
        <span className="t-meta hidden shrink-0 tracking-[0.28em] md:block">
          pp. 14 — 17
        </span>
      </div>

      {/* Pillars grid */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-3">
        {pillars.map((p, i) => (
          <article key={p.numeral} className="relative flex flex-col">
            <div className="mb-6 flex items-baseline justify-between">
              <div className="fv-display-numeral font-display text-[88px] leading-none text-brass-deep">
                {p.numeral}
              </div>
              <div className="t-meta tracking-[0.28em]">
                ★ {String(i + 1).padStart(2, "0")}
              </div>
            </div>

            <div className="t-kicker mb-4 text-[11px]">{p.kicker}</div>

            <h3 className="fv-card-soft mb-5 font-display text-[28px] font-light leading-[1.1] tracking-[-0.01em] text-ink">
              {p.title}{" "}
              <span className="fv-card-italic italic text-brass-deep">
                {p.italicWord}
              </span>
            </h3>

            <p className="mb-6 font-serif text-[16px] leading-[1.6] text-ink-soft">
              {p.body}
            </p>

            <ul className="mt-auto space-y-2.5 border-t border-paper-edge/70 pt-5">
              {p.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-baseline gap-3 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-soft"
                >
                  <span aria-hidden className="text-brass">
                    ✦
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="t-meta mt-12 tracking-[0.18em]">
        ¹ Offline capture · forthcoming · Q3 MMXXVI
      </p>
    </Plate>
  );
}
