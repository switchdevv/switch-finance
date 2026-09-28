import { DRIVER_WALLET_STATES, type DriverWalletState } from '@/lib/finance/wallet';

/**
 * The Drivers list's filters, in the URL like the restaurants directory's (see
 * restaurant-filters.ts): linkable, reload-proof, and walked back by the browser's back
 * button. Anything unrecognised falls back to the default.
 */
export type DriverStateFilter = DriverWalletState | 'all';

export type DriverFilters = {
  /** Matched against name, username and phone. */
  search?: string;
  city?: string;
  state: DriverStateFilter;
};

export const DEFAULT_DRIVER_FILTERS: DriverFilters = { state: 'all' };

export const DRIVER_STATE_OPTIONS: readonly DriverStateFilter[] = ['all', ...DRIVER_WALLET_STATES];

type ReadableParams = Pick<URLSearchParams, 'get'>;

export function parseDriverFilters(params: ReadableParams): DriverFilters {
  const state = params.get('state');
  return {
    search: params.get('q')?.trim() || undefined,
    city: params.get('city') || undefined,
    state: DRIVER_STATE_OPTIONS.includes(state as DriverStateFilter)
      ? (state as DriverStateFilter)
      : DEFAULT_DRIVER_FILTERS.state,
  };
}

export function driverFiltersToQuery(filters: DriverFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('q', filters.search);
  if (filters.city) params.set('city', filters.city);
  if (filters.state !== DEFAULT_DRIVER_FILTERS.state) params.set('state', filters.state);
  return params.toString();
}

export function isDefaultDriverFilters(filters: DriverFilters): boolean {
  return driverFiltersToQuery(filters) === '';
}
