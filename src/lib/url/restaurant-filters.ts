import {
  DEFAULT_FILTERS,
  type RestaurantFilters,
  type RestaurantFlag,
  type RestaurantStatus,
} from '@/lib/services/restaurants';

export type { RestaurantFilters };

/**
 * Filters live in the URL, not in component state — a filtered directory is then
 * linkable, survives a reload, and the browser's back button walks the user back through
 * their own narrowing rather than out of the page.
 *
 * Reading them is deliberately total: anything unrecognised in the query string falls
 * back to the default rather than rendering an empty grid nobody can explain.
 */
const STATUSES: RestaurantStatus[] = ['live', 'paused', 'unapproved', 'all'];
const FLAGS: RestaurantFlag[] = ['isFeatured', 'isDiscount', 'isPromo'];

export const FLAG_LABELS: Record<RestaurantFlag, string> = {
  isFeatured: 'Featured',
  isDiscount: 'Discount',
  isPromo: 'Promo',
};

export const STATUS_LABELS: Record<RestaurantStatus, string> = {
  live: 'Live',
  paused: 'Paused',
  unapproved: 'Not approved',
  all: 'All statuses',
};

type ReadableParams = Pick<URLSearchParams, 'get'>;

export function parseRestaurantFilters(params: ReadableParams): RestaurantFilters {
  const status = params.get('status');
  const flagsParam = params.get('flags')?.split(',') ?? [];

  return {
    status: STATUSES.includes(status as RestaurantStatus)
      ? (status as RestaurantStatus)
      : DEFAULT_FILTERS.status,
    search: params.get('q')?.trim() || undefined,
    city: params.get('city') || undefined,
    // Sorted and de-duplicated so two URLs describing the same filter set produce the
    // same React Query cache key instead of two identical fetches.
    flags: FLAGS.filter((flag) => flagsParam.includes(flag)),
  };
}

/** Serializes filters back into a query string, dropping defaults so an unfiltered
 * directory keeps the clean `/restaurants` URL. Always resets to page 1: the page the
 * user was on has no meaning in a differently-sized result set. */
export function restaurantFiltersToQuery(filters: RestaurantFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== DEFAULT_FILTERS.status) params.set('status', filters.status);
  if (filters.search) params.set('q', filters.search);
  if (filters.city) params.set('city', filters.city);
  if (filters.flags && filters.flags.length > 0) params.set('flags', filters.flags.join(','));
  return params.toString();
}

export function isDefaultFilters(filters: RestaurantFilters): boolean {
  return restaurantFiltersToQuery(filters) === '';
}
