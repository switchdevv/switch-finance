'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { User as ParseUser } from 'parse';
import { getParse } from '@/lib/parse/client';
import { queryKeys } from '@/lib/query/keys';
import { canAccessFinance, type AccessFields } from '@/lib/auth/access';

/**
 * The query cache IS the session store — no separate AuthProvider/context needed.
 * Initial state is `pending` on both the server render and the first client render
 * (queryFn never runs during SSR), which is what makes RequireAuth's anti-flash
 * behavior free: identical markup on both renders (no hydration mismatch), and
 * neither the login form nor the dashboard is shown before the session is known.
 */
export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: () => getParse().User.currentAsync<ParseUser>(),
    staleTime: Infinity, // only the mutations below change this; never refetch it
    retry: false,
  });
}

/**
 * Reads the access fields off the user object Parse hands back from `logIn`. No second
 * request: this is the caller's own row, so the login response already carries every
 * field on it.
 */
function accessFieldsOf(user: ParseUser): AccessFields {
  return {
    staffType: user.get('staffType'),
    appType: user.get('appType'),
    financeAccess: user.get('financeAccess'),
    enabled: user.get('enabled'),
  };
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const Parse = getParse();
      const user = await Parse.User.logIn<ParseUser>(username, password);

      // Authenticate, inspect, then log back out — the same shape switch-manager and
      // switch-driver use for their own appType check (screens/Login/Login.js). The
      // credentials were valid, so the alternative is a login that "succeeds" and is
      // then immediately bounced by RequireAuth into a denial screen, which reads as a
      // broken app rather than as a closed door. Tearing the session down here also
      // means a denied account leaves no Parse user behind in localStorage.
      if (!canAccessFinance(accessFieldsOf(user))) {
        await Parse.User.logOut().catch(() => {});
        throw new Parse.Error(
          Parse.Error.OPERATION_FORBIDDEN, // 119 — rendered by parseErrorKey(_, 'login')
          'This account does not have access to Switch Finance.',
        );
      }

      return user;
    },
    onSuccess: (user) => {
      // Written straight into the cache instead of invalidating + refetching — the
      // login response already IS the session, so a second round-trip to re-learn
      // what was just returned would be pure waste.
      queryClient.setQueryData(queryKeys.session, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => getParse().User.logOut(),
    // onSettled, not onSuccess: logOut() can itself throw when the session token is
    // already dead server-side, and the user must not get stuck looking signed-in
    // just because the server-side half of the logout failed.
    onSettled: () => {
      queryClient.setQueryData(queryKeys.session, null);
      // Purges every other cached query (restaurant lists, etc.) too, so a
      // differently-permissioned account logging in next can't briefly render this
      // account's stale data before its own queries land.
      queryClient.clear();
      router.replace('/login');
    },
  });
}
