import { Plate } from "./plate";
import { SectionLabel } from "./section-label";

type Stage = {
  numeral: string;
  kicker: string;
  title: string;
  italicWord: string;
  body: string;
  bullets: string[];
};

const stages: Stage[] = [
  {
    numeral: "I",
    kicker: "Quote",
    title: "Quote",
    italicWord: "the job.",
    body: "Send a quote from a template, itemized, same day the client asks. They accept online. The accepted quote becomes the survey, so the client and vessel details carry over and nothing gets typed twice.",
    bullets: [
      "Itemized line items",
      "Client accepts online",
      "Converts straight to a survey",
    ],
  },
  {
    numeral: "II",
    kicker: "Record",
    title: "Record",
    italicWord: "what you see.",
    body: "Per-field photos. Findings attached to the section they belong to. Notes by hand, dictation, or keyboard, whatever your hands are doing at the time. Works with no signal too: photos and findings save on the device and sync once you're back in range. Built for gloves, salt spray, and a flashlight in one hand.",
    bullets: [
      "Per-field photo capture",
      "Inline findings (info · advisory · critical)",
      "Handwritten, dictated, or typed",
      "Works offline, photos included",
    ],
  },
  {
    numeral: "III",
    kicker: "Report",
    title: "The report",
    italicWord: "writes itself.",
    body: "The write-up generates from your findings: sections, photos, and ratings turn into client-ready language, in the format your client expects. Nothing to compose from a blank page after the survey's done.",
    bullets: ["Generated from findings", "Branded PDF", "Client web link"],
  },
  {
    numeral: "IV",
    kicker: "Invoice",
    title: "Invoice",
    italicWord: "on completion.",
    body: "Invoice generates from the completed survey and sends to the client. Paid and outstanding, at a glance.",
    bullets: [
      "Auto-drafted on completion",
      "Sent to client",
      "Paid/outstanding view",
    ],
  },
  {
    numeral: "V",
    kicker: "Pay",
    title: "Client pays",
    italicWord: "online.",
    body: "Card or ACH, paid from the invoice link. No separate step to chase it down.",
    bullets: [
      "Card or ACH",
      "Saved payment methods",
      "Payment reflected on the invoice immediately",
    ],
  },
];

export function Pillars() {
  return (
    <Plate tone="warm" id="approach">
      {/* Section header */}
      <div className="mb-14 flex items-end justify-between gap-6 border-b border-paper-edge/70 pb-6 md:mb-20">
        <div>
          <SectionLabel numeral="II" title="The Five Stages" className="mb-3" />
          <h2 className="fv-display-soft font-display text-[clamp(2.4rem,5.4vw,4.4rem)] font-light leading-[0.98] tracking-[-0.02em] text-ink">
            You observe and document.
            <br />
            <span className="fv-display-italic italic text-ink-soft">
              The rest runs itself.
            </span>
          </h2>
        </div>
        <span className="t-meta hidden shrink-0 tracking-[0.28em] md:block">
          pp. 14 — 17
        </span>
      </div>

      {/* Stages grid */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-5">
        {stages.map((s, i) => (
          <article key={s.numeral} className="relative flex flex-col">
            <div className="mb-6 flex items-baseline justify-between">
              <div className="fv-display-numeral font-display text-[64px] leading-none text-brass-deep">
                {s.numeral}
              </div>
              <div className="t-meta tracking-[0.28em]">
                ★ {String(i + 1).padStart(2, "0")}
              </div>
            </div>

            <div className="t-kicker mb-4 text-[11px]">{s.kicker}</div>

            <h3 className="fv-card-soft mb-5 font-display text-[24px] font-light leading-[1.1] tracking-[-0.01em] text-ink">
              {s.title}{" "}
              <span className="fv-card-italic italic text-brass-deep">
                {s.italicWord}
              </span>
            </h3>

            <p className="mb-6 font-serif text-[15px] leading-[1.6] text-ink-soft">
              {s.body}
            </p>

            <ul className="mt-auto space-y-2.5 border-t border-paper-edge/70 pt-5">
              {s.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft"
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
    </Plate>
  );
}
