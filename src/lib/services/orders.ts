import { count, find, pointer, type QueryParam } from '@/lib/parse/query';
import type { DateRange } from '@/lib/finance/date-range';
import type { OrderWithUser } from '@/types/order';

const COLLECTION = 'Order';

export const ORDER_PAGE_SIZE = 20;

/**
 * The status from which an order counts as revenue. Taken from switch-manager's own
 * Summary screen (src/screens/Summary/Summary.js:19, `FINISHED_ORDER_STATUS = 2`), so
 * this dashboard's figures match what the merchant sees in their app. Note the driver
 * app uses `>= 3` for its own earnings — deliberately not adopted here.
 */
export const BILLABLE_STATUS = 2;

/** Parse refuses to return more than this many rows from one find, whatever `limit` says
 * (documented at switch-food/src/api/modules/promos.js:5). */
const PARSE_MAX_PAGE = 1000;

/** Ceiling on a whole-range fetch, so a mis-set custom range can't try to pull a year of
 * a busy restaurant into the tab. Hitting it is surfaced, never silent. */
export const MAX_RANGE_ROWS = 20_000;

/**
 * `billable` is the set every money figure is computed over: not canceled, and far
 * enough through the flow to count. `all` additionally shows canceled and in-progress
 * orders, which is useful for looking into a day but must not feed a total.
 */
export type OrderScope = 'billable' | 'all';

export type OrderQuery = {
  restaurantId: string;
  range: DateRange;
  scope: OrderScope;
};

function baseParams({ restaurantId, range, scope }: OrderQuery): QueryParam[] {
  const params: QueryParam[] = [
    { equalTo: { key: 'restaurant', value: pointer('Restaurant', restaurantId) } },
    // Every order query in the RN apps pins the vertical; keeping it here means a future
    // non-food vertical can't quietly land in a restaurant's commission.
    { equalTo: { key: 'type', value: 'food' } },
    { greaterThanOrEqualTo: { key: 'createdAt', value: range.start } },
    { lessThanOrEqualTo: { key: 'createdAt', value: range.end } },
  ];

  if (scope === 'billable') {
    params.push({ equalTo: { key: 'canceled', value: false } });
    params.push({ greaterThanOrEqualTo: { key: 'status', value: BILLABLE_STATUS } });
  }

  return params;
}

export type ListOrdersParams = OrderQuery & {
  page: number; // 1-based
  pageSize?: number;
};

export function listOrders({
  page,
  pageSize = ORDER_PAGE_SIZE,
  ...query
}: ListOrdersParams): Promise<OrderWithUser[]> {
  return find<OrderWithUser>(COLLECTION, [
    ...baseParams(query),
    { include: 'user' },
    { descending: 'createdAt' },
    { limit: pageSize },
    { skip: (page - 1) * pageSize },
  ]);
}

export function countOrders(query: OrderQuery): Promise<number> {
  return count(COLLECTION, baseParams(query));
}

export type RangeFetchResult = {
  orders: OrderWithUser[];
  /** True when MAX_RANGE_ROWS cut the fetch short — totals below are then a floor, not a
   * total, and every consumer says so out loud. */
  truncated: boolean;
};

/**
 * Every order in the range, paged around Parse's 1000-row ceiling.
 *
 * This exists because the backend has no aggregation cloud function — the tiles, the
 * spreadsheet and the invoice all have to sum raw rows client-side. (switch-manager's
 * Summary screen asks for `limit: 10000` in a single find and silently receives 1000;
 * its figures are wrong for any busy restaurant-month. That's the bug this loop avoids.)
 *
 * No `select` narrowing: combining it with `include: 'user'` is where Parse quietly drops
 * fields, and an order row is small enough that the saving isn't worth a silently empty
 * column in an exported invoice.
 */
export async function fetchOrdersInRange(query: OrderQuery): Promise<RangeFetchResult> {
  const orders: OrderWithUser[] = [];

  for (let skip = 0; skip < MAX_RANGE_ROWS; skip += PARSE_MAX_PAGE) {
    const page = await find<OrderWithUser>(COLLECTION, [
      ...baseParams(query),
      { include: 'user' },
      // Ascending here, unlike the table: a spreadsheet and an invoice read
      // oldest-first, and it keeps paging stable while rows are being created.
      { ascending: 'createdAt' },
      { limit: PARSE_MAX_PAGE },
      { skip },
    ]);

    orders.push(...page);
    if (page.length < PARSE_MAX_PAGE) return { orders, truncated: false };
  }

  return { orders, truncated: true };
}
