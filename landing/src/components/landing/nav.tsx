import Link from "next/link";
import { Wordmark } from "./marks";
import { PrimaryButton } from "./primary-button";

const links = [
  { href: "/field-guide", label: "Field Guide" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "Almanac" },
];

export function Nav() {
  return (
    <header className="relative z-20 border-b border-paper-edge/70">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 md:px-10 md:py-5">
        <Link href="/" className="group inline-flex items-center">
          <Wordmark className="transition-colors group-hover:text-brass-deep" />
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="t-link link-grow hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="t-link link-grow hidden hover:text-ink sm:inline"
          >
            Sign in
          </Link>
          <PrimaryButton href="/get-started" size="compact" showStar={false}>
            <span className="sm:hidden">Begin</span>
            <span className="hidden sm:inline">Begin a survey</span>
          </PrimaryButton>
        </div>
      </div>
    </header>
  );
}
