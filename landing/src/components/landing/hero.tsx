import { CompassRose, Soundings } from "./marks";
import { PrimaryButton } from "./primary-button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto max-w-[1440px] px-6 md:px-10">
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
            41&deg;18′N &nbsp;—&nbsp; 72&deg;55′W &nbsp;·&nbsp; New Haven, CT
          </span>
          <span className="hidden sm:inline">Charted in fair weather</span>
          <span className="sm:hidden">Fair weather</span>
        </div>

        <div className="relative grid grid-cols-12 gap-x-6 py-12 md:py-20 lg:py-28">
          {/* Left column header */}
          <div className="col-span-12 lg:col-span-8">
            <div className="rise rise-2 mb-8 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.28em] text-brass-deep">
              <span className="inline-block h-px w-9 bg-brass-deep" />
              Modern software for marine surveyors
            </div>

            <h1 className="rise rise-3 fv-display-soft font-display text-[clamp(3.6rem,9.8vw,9.2rem)] font-light leading-[0.92] tracking-[-0.025em] text-ink">
              <span className="block">The complete</span>
              <span className="block">
                survey{" "}
                <span className="fv-display-italic font-display italic text-brass-deep">
                  business.
                </span>
              </span>
            </h1>

            <div className="rise rise-5 mt-12 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <PrimaryButton href="/#waitlist">Join waitlist</PrimaryButton>
            </div>
          </div>

          {/* Right column — rose + lede */}
          <div className="relative col-span-12 mt-12 lg:col-span-4 lg:mt-0">
            <Soundings
              count={160}
              className="absolute -inset-y-12 left-[-40%] right-[-50vw] opacity-40"
              style={{
                WebkitMaskImage:
                  "radial-gradient(ellipse 55% 55% at 35% 30%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, transparent 85%)",
                maskImage:
                  "radial-gradient(ellipse 55% 55% at 35% 30%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, transparent 85%)",
              }}
            />
            <div className="rise rise-4 relative mb-10 flex justify-end">
              <CompassRose size={240} className="-rotate-[11deg]" />
            </div>

            <div className="rise rise-5 relative border-l border-paper-edge pl-6">
              <p className="font-serif text-[17px] leading-[1.55] text-ink-soft">
                Focus on the findings. We send the quote, write the report,
                deliver it, invoice, and{" "}
                <em className="italic text-ink">collect payment.</em>
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
