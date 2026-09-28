import { find, pointer } from '@/lib/parse/query';
import type { DateRange } from '@/lib/finance/date-range';
import type { DriverOrder } from '@/types/order';
import { MAX_RANGE_ROWS, type RangeFetchResult } from './orders';

const COLLECTION = 'Order';

/** Parse's own ceiling on one find — see lib/services/orders.ts. */
const PARSE_MAX_PAGE = 1000;

export type DriverRangeResult = Omit<RangeFetchResult, 'orders'> & { orders: DriverOrder[] };

/**
 * Every order carrying this driver in a period, whatever became of it, oldest first — the
 * Finance tab counts the canceled and the open ones too, and only settles the delivered
 * (lib/finance/driver-settlement.ts). Paged around Parse's 1000-row ceiling like a
 * restaurant's range; served by the `{ _p_driver: 1, _created_at: -1 }` index ops added.
 *
 * The restaurant is included for its name: it is where the driver collected the order.
 */
export async function fetchDriverOrdersInRange(
  driverId: string,
  range: Pick<DateRange, 'start' | 'end'>,
): Promise<DriverRangeResult> {
  const orders: DriverOrder[] = [];

  for (let skip = 0; skip < MAX_RANGE_ROWS; skip += PARSE_MAX_PAGE) {
    const page = await find<DriverOrder>(COLLECTION, [
      { equalTo: { key: 'driver', value: pointer('_User', driverId) } },
      { equalTo: { key: 'type', value: 'food' } },
      { greaterThanOrEqualTo: { key: 'createdAt', value: range.start } },
      { lessThanOrEqualTo: { key: 'createdAt', value: range.end } },
      { include: 'restaurant' },
      { ascending: 'createdAt' },
      { addAscending: 'objectId' },
      { limit: PARSE_MAX_PAGE },
      { skip },
    ]);

    orders.push(...page);
    if (page.length < PARSE_MAX_PAGE) return { orders, truncated: false };
  }

  return { orders, truncated: true };
}
