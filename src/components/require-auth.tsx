'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { FullPageLoader } from './full-page-loader';

/**
 * UX gate, not a security boundary — the session lives in localStorage, which a
 * server-side Next proxy/middleware cannot see (it would treat every request as
 * anonymous), so this can only run client-side, after the bundle has already
 * loaded. Real protection is the Parse ACL/CLP on the backend: a request without a
 * valid session token is rejected there regardless of what this component renders.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isPending && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isPending, user, pathname, router]);

  if (isPending || !user) {
    return <FullPageLoader />;
  }

  // future: if (!isAuthorized(user)) return <NotAuthorized />; — user.get('appType')
  // is already available on the session object above, so a role gate is one
  // predicate here and no additional plumbing.

  return <>{children}</>;
}
