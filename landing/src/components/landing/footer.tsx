import Link from "next/link";

const links = [
  { href: "/#approach", label: "Approach" },
  { href: "/#workspace", label: "Workspace" },
  { href: "/#specs", label: "Specs" },
  { href: "/#pricing", label: "Pricing" },
];

export function Footer() {
  return (
    <footer className="border-t border-paper-edge/60 bg-paper-warm/40">
      <div className="mx-auto flex max-w-[1440px] flex-col items-start gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-10">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          <span>© MMXXVI Marlin Survey, Inc.</span>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="link-grow hover:text-ink">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-moss" />
          All systems clear
        </div>
      </div>
    </footer>
  );
}
