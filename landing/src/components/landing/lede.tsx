import { Plate } from "./plate";

export function Lede() {
  return (
    <Plate>
      <div className="grid grid-cols-12 gap-x-6 gap-y-10">
        {/* Section label */}
        <div className="col-span-12 md:col-span-3">
          <div className="t-kicker sticky top-8 flex items-start gap-3">
            <span aria-hidden className="mt-2 inline-block h-px w-6 bg-brass-deep" />
            <span>
              §&nbsp;I
              <br />
              <span className="text-ink-muted">The Preface</span>
            </span>
          </div>
        </div>

        {/* Body — magazine lede with drop cap */}
        <div className="col-span-12 md:col-span-9 md:max-w-[820px]">
          <p className="dropcap font-serif text-[22px] leading-[1.5] text-ink md:text-[26px] md:leading-[1.48]">
            Marine surveying comes down to one thing: what you find on the
            boat. The quote, the report, delivery, the invoice, getting paid:
            all of it{" "}
            <em className="italic text-brass-deep">is handled.</em> Record
            findings by hand, voice, or keyboard, with photos, on the dock or
            with no signal at all.
          </p>

        </div>
      </div>
    </Plate>
  );
}
