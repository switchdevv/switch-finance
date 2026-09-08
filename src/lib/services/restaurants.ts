import { count, find, findOne, pointer, type QueryParam } from '@/lib/parse/query';
import type { Restaurant, RestaurantWithRelations } from '@/types/restaurant';

const COLLECTION = 'Restaurant';

export const RESTAURANT_PAGE_SIZE = 20;

/**
 * The three states StatusChip renders, expressed as a query. `enabled` is the platform's
 * approval and `active` the manager's own pause toggle — see components/ui/status-chip.
 */
export type RestaurantStatus = 'live' | 'paused' | 'unapproved' | 'all';

export type RestaurantFlag = 'isFeatured' | 'isDiscount' | 'isPromo';

export type RestaurantFilters = {
  status: RestaurantStatus;
  /** Matched against `searchName` (the lowercased copy of `name` the RN apps maintain). */
  search?: string;
  /** City objectId. */
  city?: string;
  flags?: RestaurantFlag[];
};

export const DEFAULT_FILTERS: RestaurantFilters = { status: 'live' };

/**
 * One filter → params translation shared by the rows query and the count query, so the
 * grid and its "of N" total can never describe different sets.
 *
 * `notEqualTo` is what makes `paused`/`unapproved` correct rather than merely convenient:
 * it matches rows where the field is absent entirely, and plenty of older rows never had
 * `enabled`/`active` written. That mirrors StatusChip's own ladder, where a missing flag
 * reads as not-approved / paused rather than as live.
 */
export function buildFilterParams(filters: RestaurantFilters): QueryParam[] {
  const params: QueryParam[] = [];

  if (filters.status === 'live') {
    params.push({ equalTo: { key: 'enabled', value: true } });
    params.push({ equalTo: { key: 'active', value: true } });
  } else if (filters.status === 'paused') {
    params.push({ equalTo: { key: 'enabled', value: true } });
    params.push({ notEqualTo: { key: 'active', value: true } });
  } else if (filters.status === 'unapproved') {
    params.push({ notEqualTo: { key: 'enabled', value: true } });
  }

  const search = filters.search?.trim();
  if (search) {
    // Against searchName, not name: it's the lowercased copy the RN apps keep for exactly
    // this purpose, so the match is case-insensitive without a regex modifier.
    params.push({ matches: { key: 'searchName', value: search.toLowerCase() } });
  }

  if (filters.city) {
    params.push({ equalTo: { key: 'city', value: pointer('City', filters.city) } });
  }

  for (const flag of filters.flags ?? []) {
    params.push({ equalTo: { key: flag, value: true } });
  }

  return params;
}

export type ListRestaurantsParams = {
  page: number; // 1-based
  pageSize?: number;
  filters?: RestaurantFilters;
};

/**
 * Sorted by `descending: 'createdAt'`, not name — `createdAt` is always indexed in
 * Parse, `name` may not be, and an unindexed sort over a large class is slow or
 * refused outright. No `include` here either: the list view doesn't show city or
 * category names, so resolving those pointers on every row would cost a join for
 * columns nobody sees.
 */
export function listRestaurants({
  page,
  pageSize = RESTAURANT_PAGE_SIZE,
  filters = DEFAULT_FILTERS,
}: ListRestaurantsParams): Promise<Restaurant[]> {
  return find<Restaurant>(COLLECTION, [
    ...buildFilterParams(filters),
    { descending: 'createdAt' },
    { limit: pageSize },
    { skip: (page - 1) * pageSize },
  ]);
}

export function countRestaurants(filters: RestaurantFilters = DEFAULT_FILTERS): Promise<number> {
  return count(COLLECTION, buildFilterParams(filters));
}

/**
 * `city` and `categories` are `include`d here (unlike the list query) so the detail page
 * can show their names — and, for `city`, the currency every money figure on the report
 * is rendered in.
 */
export function getRestaurant(objectId: string): Promise<RestaurantWithRelations | null> {
  return findOne<RestaurantWithRelations>(COLLECTION, [
    { equalTo: { key: 'objectId', value: objectId } },
    { include: 'city' },
    { include: 'categories' },
  ]);
}
