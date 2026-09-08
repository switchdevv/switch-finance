'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '@/lib/parse/mutate';
import { queryKeys } from '@/lib/query/keys';

export type SetFinanceAccessVars = { userId: string; granted: boolean };

/**
 * Grants or revokes one account's finance access.
 *
 * Calls `setFinanceAccess`, which does not exist on the server yet — until the platform
 * team deploys it (docs/finance-access-backend.md) every call fails with Parse code 141,
 * and `parseErrorMessage(error, 'grant')` renders that as the "not enabled on the server
 * yet" message rather than a generic failure. The UI is wired end-to-end so that the day
 * the function lands, nothing here has to change.
 */
export function useSetFinanceAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, granted }: SetFinanceAccessVars) =>
      callFunction<unknown>('setFinanceAccess', { userId, granted }),
    onSuccess: (_data, { userId }) => {
      // The list, so the row's chip and switch reflect the new value...
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
      // ...and that account's own access row, which is what the gate reads. This matters
      // when an admin edits their own pool entry from another tab: the gate would
      // otherwise keep the old answer for the rest of its staleTime.
      queryClient.invalidateQueries({ queryKey: queryKeys.access.current(userId) });
    },
  });
}
