'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { queryKeys } from '@/lib/query/keys';
import { getAccessFor } from '@/lib/services/staff';
import { financeRole, type FinanceRole } from '@/lib/auth/access';

export type AccessState = {
  role: FinanceRole;
  /** The session or the access row is still resolving — render a loader, never a verdict. */
  isPending: boolean;
  /** The access read itself failed. Distinct from `role === null` on purpose: a network
   * blip or a CLP change is not the same answer as "this account has no access", and
   * showing the denial screen for it would be a lie the user can't act on. */
  isError: boolean;
  error: unknown;
  refetch: () => void;
};

/**
 * The signed-in account's finance role, re-read from the server on every page load.
 *
 * The server round-trip is the whole point. `useSession` resolves from
 * `Parse.User.currentAsync()`, which reads localStorage — a grant revoked by an admin
 * would never be noticed by a browser that already has a session, for as long as its
 * token lived. Re-reading the row means a revoke takes effect on the next navigation.
 */
export function useAccess(): AccessState {
  const { data: user, isPending: sessionPending } = useSession();
  const objectId = user?.id ?? '';

  const query = useQuery({
    queryKey: queryKeys.access.current(objectId),
    queryFn: () => getAccessFor(objectId),
    enabled: objectId.length > 0,
    // Long enough that moving between pages doesn't re-ask on every navigation, short
    // enough that a revoked grant surfaces within a minute rather than at session end.
    staleTime: 60_000,
  });

  return {
    role: financeRole(query.data),
    // A disabled query sits in `pending` forever, so the session's own pending state is
    // what covers the window before there's an id to query with.
    isPending: sessionPending || (objectId.length > 0 && query.isPending),
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}
