import {
  DEFAULT_FILTERS,
  type AccessFilter,
  type StaffFilters,
} from '@/lib/services/staff';

export type { StaffFilters };

/**
 * Filters live in the URL, not in component state — the same reasoning as the restaurants
 * directory (lib/url/restaurant-filters.ts): the view is then linkable, survives a
 * reload, and the back button walks the admin back through their own narrowing.
 *
 * Reading is total: anything unrecognised falls back to the default rather than rendering
 * an empty grid nobody can explain.
 */
const ACCESS_VALUES: AccessFilter[] = ['all', 'granted', 'denied'];

export const ACCESS_LABELS: Record<AccessFilter, string> = {
  all: 'All',
  granted: 'Has access',
  denied: 'No access',
};

type ReadableParams = Pick<URLSearchParams, 'get'>;

export function parseStaffFilters(params: ReadableParams): StaffFilters {
  const access = params.get('access');

  return {
    access: ACCESS_VALUES.includes(access as AccessFilter)
      ? (access as AccessFilter)
      : DEFAULT_FILTERS.access,
    search: params.get('q')?.trim() || undefined,
  };
}

/** Serializes filters back into a query string, dropping defaults so the unfiltered list
 * keeps the clean `/access` URL. */
export function staffFiltersToQuery(filters: StaffFilters): string {
  const params = new URLSearchParams();
  if (filters.access !== DEFAULT_FILTERS.access) params.set('access', filters.access);
  if (filters.search) params.set('q', filters.search);
  return params.toString();
}

export function isDefaultFilters(filters: StaffFilters): boolean {
  return staffFiltersToQuery(filters) === '';
}
