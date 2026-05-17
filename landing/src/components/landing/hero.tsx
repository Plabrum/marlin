import Link from "next/link";
import { CompassRose, NauticalRule, TopoLines } from "./marks";
import { PrimaryButton } from "./primary-button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <TopoLines className="pointer-events-none absolute -right-32 top-20 hidden h-[640px] w-[820px] text-ocean/40 md:block" />

      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        {/* Issue metadata strip */}
        <div className="rise rise-1 flex items-center justify-between gap-4 whitespace-nowrap border-b border-paper-edge/70 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rust pulse-dot" />
            <span className="hidden sm:inline">
              Vol. I &middot; No. 01 &middot; Estab. <span aria-hidden>✦</span> MMXXVI
            </span>
            <span className="sm:hidden">Vol. I &middot; No. 01</span>
          </span>
          <span className="hidden lg:block">
            41&deg;22′N &nbsp;—&nbsp; 70&deg;57′W &nbsp;·&nbsp; Newport, R.I.
          </span>
          <span className="hidden sm:inline">Charted in fair weather</span>
          <span className="sm:hidden">Fair weather</span>
        </div>

        <div className="relative grid grid-cols-12 gap-x-6 py-12 md:py-20 lg:py-28">
          {/* Left column header */}
          <div className="col-span-12 lg:col-span-8">
            <div className="rise rise-2 mb-8 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.28em] text-brass-deep">
              <span className="inline-block h-px w-9 bg-brass-deep" />
              An almanac for marine surveyors
            </div>

            <h1 className="rise rise-3 fv-display-soft font-display text-[clamp(3.6rem,9.8vw,9.2rem)] font-light leading-[0.92] tracking-[-0.025em] text-ink">
              <span className="block">Marine surveys,</span>
              <span className="block">
                charted{" "}
                <span className="fv-display-italic font-display italic text-brass-deep">
                  carefully.
                </span>
              </span>
            </h1>

            <div className="rise rise-5 mt-12 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <PrimaryButton href="/get-started">Begin a survey</PrimaryButton>

              <Link
                href="/field-guide"
                className="link-rule font-serif text-[15px] italic text-ink-soft hover:text-brass-deep"
              >
                or read the field guide
              </Link>
            </div>
          </div>

          {/* Right column — compass + lede */}
          <div className="relative col-span-12 mt-12 lg:col-span-4 lg:mt-0">
            <div className="rise rise-4 relative mb-8 flex justify-end">
              <CompassRose size={260} className="drift" />
            </div>

            <div className="rise rise-5 relative border-l border-paper-edge pl-6">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.26em] text-ink-muted">
                Editor&rsquo;s note
              </p>
              <p className="font-serif text-[17px] leading-[1.55] text-ink-soft">
                Sloopquest is a workspace for marine surveyors — built for the
                dock, careful with findings, quick to publish. Capture
                conditions on the water, then ship a{" "}
                <em className="italic text-ink">polished report</em> the same
                day.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-6 pb-6">
          <NauticalRule className="h-3 flex-1 text-ink/60" />
          <span className="-mb-1 shrink-0 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
            ☞ Continue below
          </span>
        </div>
      </div>
    </section>
  );
}
