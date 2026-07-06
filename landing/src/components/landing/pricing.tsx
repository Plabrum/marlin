import { Plate } from "./plate";
import { SectionLabel } from "./section-label";

type BillingOption = {
  numeral: string;
  kicker: string;
  name: string;
  price: string;
  unit: string;
  blurb: string;
  footnote: string;
};

const billingOptions: BillingOption[] = [
  {
    numeral: "I",
    kicker: "Billed monthly",
    name: "Monthly",
    price: "$50",
    unit: "flat · per month",
    blurb:
      "Pause anytime in the off season. No charge while paused, pick back up when you're surveying again.",
    footnote: "No per-seat, no per-survey. Bring the whole crew.",
  },
  {
    numeral: "II",
    kicker: "Billed annually",
    name: "Annual",
    price: "$300",
    unit: "flat · per year",
    blurb: "Same plan, paid once a year. Works out to $25/mo.",
    footnote: "Switch to monthly at renewal, any time.",
  },
];

const included = [
  "Unlimited vessels and surveys",
  "All field types and templates",
  "Branded PDF & client web link",
  "Hands-free dictation",
  "Offline capture, photos included",
];

export function Pricing() {
  return (
    <Plate tone="warm" id="pricing">
      {/* Header — posted tariff */}
      <div className="mb-14 grid grid-cols-12 items-end gap-6 border-b border-paper-edge/70 pb-7 md:mb-20">
        <div className="col-span-12 md:col-span-8">
          <SectionLabel numeral="VI" title="Posted Tariff" className="mb-3" />
          <h2 className="fv-display-soft font-display text-[clamp(2.4rem,5.4vw,4.4rem)] font-light leading-[0.98] tracking-[-0.02em] text-ink">
            Simple{" "}
            <span className="fv-display-italic italic text-ink-soft">
              pricing.
            </span>
          </h2>
        </div>
        <div className="col-span-12 hidden flex-col items-end gap-1 md:col-span-4 md:flex">
          <span className="t-meta tracking-[0.28em]">No. 7 — Schedule of Fees</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            effective season 2026
          </span>
        </div>
      </div>

      {/* Fee schedule — two columns, like a posted ledger */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-2">
        {billingOptions.map((b, i) => (
          <article
            key={b.numeral}
            className={`relative flex flex-col border-paper-edge/70 ${
              i === 0
                ? "md:border-r md:pr-12"
                : "md:pl-2"
            }`}
          >
            {/* Top rail: numeral + ledger no. */}
            <div className="mb-6 flex items-baseline justify-between">
              <div className="fv-display-numeral font-display text-[88px] leading-none text-brass-deep">
                {b.numeral}
              </div>
              <div className="t-meta tracking-[0.28em]">
                ★ ENTRY {String(i + 1).padStart(2, "0")}
              </div>
            </div>

            <div className="t-kicker mb-4 text-[11px]">{b.kicker}</div>

            <h3 className="fv-card-soft mb-6 font-display text-[28px] font-light leading-[1.1] tracking-[-0.01em] text-ink">
              {b.name}
            </h3>

            {/* Price block — large numeral, mono unit beneath */}
            <div className="mb-6 flex items-baseline gap-3 border-y border-paper-edge/70 py-5">
              <span className="fv-display-soft font-display text-[64px] font-light leading-none tracking-[-0.02em] text-ink">
                {b.price}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                {b.unit}
              </span>
            </div>

            <p className="mb-6 font-serif text-[16px] leading-[1.6] text-ink-soft">
              {b.blurb}
            </p>

            <p className="mt-auto border-t border-paper-edge/70 pt-4 font-serif text-[13px] italic leading-[1.45] text-ink-muted">
              {b.footnote}
            </p>
          </article>
        ))}
      </div>

      {/* Included — shared across both billing options */}
      <div className="mt-14 border-t border-paper-edge/70 pt-10">
        <div className="t-kicker mb-5 text-[11px]">Included, either way</div>
        <ul className="grid grid-cols-1 gap-x-10 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {included.map((line) => (
            <li
              key={line}
              className="flex items-baseline gap-3 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-soft"
            >
              <span aria-hidden className="text-brass">
                ✦
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

    </Plate>
  );
}
