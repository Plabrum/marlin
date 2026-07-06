import { CompassRose } from "./marks";
import { Plate } from "./plate";
import { SectionLabel } from "./section-label";

export function Cta() {
  return (
    <Plate tone="ink" id="waitlist" size="lg" className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-16 top-1/2 hidden -translate-y-1/2 md:block">
        <CompassRose size={360} className="opacity-[0.08] drift" />
      </div>

      <div className="relative grid grid-cols-1 items-end gap-x-10 gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SectionLabel title="The Invitation" tone="light" className="mb-5" />
          <h2 className="fv-display-soft font-display text-[clamp(2.4rem,5.4vw,4.2rem)] font-light leading-[1] tracking-[-0.02em] text-paper-warm">
            Join the{" "}
            <span className="fv-display-italic italic text-brass-light">
              waitlist.
            </span>
          </h2>
          <p className="mt-5 max-w-lg font-serif text-[16px] leading-[1.6] text-paper-warm/70">
            Quoting, recording, reporting, invoicing, payment: one system,
            built for marine surveyors. Be first in when it opens.
          </p>
        </div>

        <div className="lg:col-span-5">
          <form className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="cta-waitlist-email" className="sr-only">
              Email
            </label>
            <input
              id="cta-waitlist-email"
              type="email"
              placeholder="you@marlinsurvey.com"
              className="flex-1 border border-paper-warm/25 bg-transparent px-4 py-3.5 font-serif text-[15px] text-paper-warm placeholder:text-paper-warm/40 focus:border-brass-light focus:outline-none"
            />
            <button
              type="submit"
              className="group inline-flex items-center justify-center gap-2 whitespace-nowrap border border-brass-light bg-brass-light px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink transition-colors hover:bg-brass"
            >
              Join waitlist
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </form>
          <p className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper-warm/45">
            <span className="inline-block h-1 w-1 rounded-full bg-moss" />
            No spam. No card, ever, just to join the list.
          </p>
        </div>
      </div>
    </Plate>
  );
}
