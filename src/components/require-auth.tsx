'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@heroui/react';
import { useSession } from '@/hooks/use-session';
import { useAccess } from '@/hooks/use-access';
import { parseErrorMessage } from '@/lib/parse/errors';
import { FullPageLoader } from './full-page-loader';
import { NotAuthorized } from './not-authorized';

/**
 * UX gate, not a security boundary — the session lives in localStorage, which a
 * server-side Next proxy/middleware cannot see (it would treat every request as
 * anonymous), so this can only run client-side, after the bundle has already
 * loaded. Real protection is the Parse ACL/CLP on the backend: a request without a
 * valid session token is rejected there regardless of what this component renders.
 *
 * The same caveat applies to the role check below, and more sharply: until the backend
 * ships the `beforeSave` trigger in docs/finance-access-backend.md, any account can write
 * `financeAccess` onto its own row, so this gate keeps the wrong people *out of the UI*
 * without yet keeping them out of the data. That trigger is what turns it into a boundary.
 *
 * Both layouts mount this component (app/(dashboard) and app/(print)), and the check
 * lives here rather than in either of them so the print routes can't become the way
 * around it — an invoice URL is a guessable query string, not a secret.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useSession();
  const access = useAccess();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isPending && !user) {
      // The query string is part of where the user was trying to go, not decoration:
      // a restaurant is addressed as /restaurants/detail?id=… (see lib/url/routes.ts),
      // so sending only the pathname through the login round-trip would land them on a
      // detail page with no restaurant. Read from location rather than
      // useSearchParams(), which would oblige every layout using this to sit inside a
      // Suspense boundary; this only ever runs in the browser.
      const target = pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(target)}`);
    }
  }, [isPending, user, pathname, router]);

  if (isPending || !user || access.isPending) {
    return <FullPageLoader />;
  }

  // A failed check is not a denial. The access row is read over the network, so this
  // branch is a dropped connection or a CLP change — telling someone they have no access
  // when the truth is "we couldn't ask" sends them to an admin for a problem an admin
  // can't fix. Offer the retry instead.
  if (access.isError) {
    return (
      <NotAuthorized
        title="Couldn't verify your access"
        description={parseErrorMessage(access.error, 'fetch')}
        action={
          <Button variant="primary" size="sm" onPress={access.refetch}>
            Try again
          </Button>
        }
      />
    );
  }

  if (access.role === null) {
    return <NotAuthorized />;
  }

  return <>{children}</>;
}
