'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { DateRange } from '@/lib/finance/date-range';
import { queryKeys } from '@/lib/query/keys';
import {
  countOrders,
  fetchOrdersInRange,
  listOrders,
  ORDER_PAGE_SIZE,
  type OrderScope,
} from '@/lib/services/orders';

export { ORDER_PAGE_SIZE };

type Args = { restaurantId: string; range: DateRange; scope: OrderScope };

const rangeKey = (range: DateRange) => ({ from: range.from, to: range.to });

export function useOrders({ restaurantId, range, scope }: Args, page: number) {
  return useQuery({
    queryKey: queryKeys.orders.list(restaurantId, rangeKey(range), scope, page),
    queryFn: () => listOrders({ restaurantId, range, scope, page }),
    placeholderData: keepPreviousData,
  });
}

export function useOrdersCount({ restaurantId, range, scope }: Args) {
  return useQuery({
    queryKey: queryKeys.orders.count(restaurantId, rangeKey(range), scope),
    queryFn: () => countOrders({ restaurantId, range, scope }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * The whole range in one array — what the tiles sum and what the spreadsheet and invoice
 * are built from. Always scoped to billable orders: a total that included canceled rows
 * would be wrong, and no consumer of this wants one.
 *
 * Cached for a minute and shared by all three consumers, so opening the export menu or
 * the invoice tab after the tiles have loaded costs nothing.
 */
export function useOrdersInRange(restaurantId: string, range: DateRange) {
  return useQuery({
    queryKey: queryKeys.orders.range(restaurantId, rangeKey(range), 'billable'),
    queryFn: () => fetchOrdersInRange({ restaurantId, range, scope: 'billable' }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    // Matches useRestaurant: an invoice link that lost its ?id= has nothing to total.
    enabled: restaurantId.length > 0,
  });
}
