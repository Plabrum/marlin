import { Navigate, useSearch } from '@tanstack/react-router';
import { useAuthMagicLinkVerifyVerifyMagicLink } from '@/openapi/auth/auth';

export function MagicLinkVerifyPage() {
  const search = useSearch({ from: '/_public/auth/magic-link/verify' });
  const token = search.token;

  const { isSuccess, isError } = useAuthMagicLinkVerifyVerifyMagicLink(
    { token },
    { query: { enabled: !!token, retry: false } }
  );

  if (!token || isError) return <Navigate to="/auth" replace />;
  if (isSuccess) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <p className="font-display text-foreground text-2xl tracking-wide">
        Marlin Survey
      </p>
      <p className="text-muted-foreground text-sm">
        Verifying your link&hellip;
      </p>
    </div>
  );
}
