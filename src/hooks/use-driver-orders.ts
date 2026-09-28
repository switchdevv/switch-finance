'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { DateRange } from '@/lib/finance/date-range';
import { queryKeys } from '@/lib/query/keys';
import { fetchDriverOrdersInRange } from '@/lib/services/driver-orders';

/**
 * The driver's orders in a period — what the Finance tab settles, and what its spreadsheet
 * and printed statement are built from. Shared through the cache, so opening the statement
 * after the tab has loaded costs nothing.
 */
const rangeKey = (range: DateRange) => ({ from: range.from, to: range.to });

export function useDriverOrdersInRange(driverId: string, range: DateRange) {
  return useQuery({
    queryKey: queryKeys.drivers.orders(driverId, rangeKey(range)),
    queryFn: () => fetchDriverOrdersInRange(driverId, range),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: driverId.length > 0,
  });
}
