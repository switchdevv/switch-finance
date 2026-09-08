import type { RestaurantFilters } from '@/lib/services/restaurants';
import type { OrderScope } from '@/lib/services/orders';
import type { StaffFilters } from '@/lib/services/staff';

/** The slice of a resolved range that identifies it for caching — the instants, not the
 * label, so two equivalent ranges reached by different routes share one cache entry. */
type RangeKey = { from: string; to: string };

/**
 * Single source of truth for cache identity. Keys are never written inline in a
 * hook or component — every query/mutation that touches the cache imports from here,
 * so invalidation and cache seeding stay obvious as more resources are added.
 *
 * Filter objects are passed through whole: React Query hashes them with sorted keys, so
 * two identical filter sets always land on the same entry regardless of field order.
 */
export const queryKeys = {
  session: ['session'] as const,
  /** The signed-in account's access fields, re-read from the server (see hooks/use-access.ts).
   * Keyed by objectId rather than being a singleton so signing in as a second account can't
   * inherit the first one's answer out of the cache. */
  access: {
    current: (objectId: string) => ['access', 'current', objectId] as const,
  },
  staff: {
    all: ['staff'] as const,
    list: (page: number, pageSize: number, filters: StaffFilters) =>
      ['staff', 'list', page, pageSize, filters] as const,
    count: (filters: StaffFilters) => ['staff', 'count', filters] as const,
  },
  cities: {
    all: ['cities'] as const,
    list: () => ['cities', 'list'] as const,
  },
  restaurants: {
    all: ['restaurants'] as const,
    list: (page: number, pageSize: number, filters: RestaurantFilters) =>
      ['restaurants', 'list', page, pageSize, filters] as const,
    count: (filters: RestaurantFilters) => ['restaurants', 'count', filters] as const,
    detail: (objectId: string) => ['restaurants', 'detail', objectId] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (restaurantId: string, range: RangeKey, scope: OrderScope, page: number) =>
      ['orders', 'list', restaurantId, range, scope, page] as const,
    count: (restaurantId: string, range: RangeKey, scope: OrderScope) =>
      ['orders', 'count', restaurantId, range, scope] as const,
    /** The whole-range fetch behind the tiles, the spreadsheet and the invoice. */
    range: (restaurantId: string, range: RangeKey, scope: OrderScope) =>
      ['orders', 'range', restaurantId, range, scope] as const,
  },
  foods: {
    all: ['foods'] as const,
    /** Dish names for the Products column. Keyed by the range rather than by the id list
     * it resolves to: the ids are derived from that range's orders, so the range is the
     * stable name for the same lookup. */
    names: (restaurantId: string, range: RangeKey) =>
      ['foods', 'names', restaurantId, range] as const,
  },
} as const;
