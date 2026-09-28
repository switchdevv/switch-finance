'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { getDriver, listDrivers } from '@/lib/services/drivers';

/** The whole fleet, joined to the wallets and searched in the browser. */
export function useDrivers() {
  return useQuery({
    queryKey: queryKeys.drivers.list(),
    queryFn: listDrivers,
    // Accounts change rarely; online status is shown as a hint, not tracked live.
    staleTime: 60_000,
  });
}

export function useDriver(objectId: string) {
  return useQuery({
    queryKey: queryKeys.drivers.detail(objectId),
    queryFn: () => getDriver(objectId),
    // An empty ?id= is a dead link, not a row to look up (see lib/url/routes.ts).
    enabled: objectId.length > 0,
  });
}
