'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { listCities } from '@/lib/services/cities';

/** Cities change about never, so this is cached for the session rather than refetched
 * behind every filter change. */
export function useCities() {
  return useQuery({
    queryKey: queryKeys.cities.list(),
    queryFn: listCities,
    staleTime: Infinity,
  });
}
