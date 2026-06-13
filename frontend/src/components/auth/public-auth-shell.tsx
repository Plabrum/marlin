/**
 * Shared layout for any public-facing page — sign-in, magic-link verify,
 * invite accept, error pages. Owns the wordmark + copyright so branding
 * changes live in one place.
 */
export function PublicAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center px-4 py-6">
      <div className="mb-10 flex flex-col items-center text-center">
        <span className="font-display text-foreground text-4xl font-normal tracking-tight">
          Sloopquest
        </span>
        <span
          aria-hidden="true"
          className="mt-3 h-px w-16 bg-[var(--color-brass)]/60"
        />
      </div>
      {children}
      <p className="t-meta mt-8">&copy; 2026 Sloopquest, Inc.</p>
    </div>
  );
}
