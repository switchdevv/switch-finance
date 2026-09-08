'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import {
  countRestaurants,
  DEFAULT_FILTERS,
  getRestaurant,
  listRestaurants,
  RESTAURANT_PAGE_SIZE,
  type RestaurantFilters,
} from '@/lib/services/restaurants';

export { RESTAURANT_PAGE_SIZE };

export function useRestaurants(
  page: number,
  filters: RestaurantFilters = DEFAULT_FILTERS,
  pageSize: number = RESTAURANT_PAGE_SIZE,
) {
  return useQuery({
    queryKey: queryKeys.restaurants.list(page, pageSize, filters),
    queryFn: () => listRestaurants({ page, pageSize, filters }),
    // Keeps the current page's rows on screen while the next page (or the next filter
    // combination) loads, so paging never collapses the layout or flashes a skeleton
    // (see isPlaceholderData in RestaurantsTable). This also makes a hand-rolled "ignore
    // stale responses" guard unnecessary: React Query already discards a response whose
    // key has been superseded, so typing quickly in the search box can't render the
    // results of an earlier keystroke.
    placeholderData: keepPreviousData,
  });
}

export function useRestaurantsCount(filters: RestaurantFilters = DEFAULT_FILTERS) {
  return useQuery({
    queryKey: queryKeys.restaurants.count(filters),
    queryFn: () => countRestaurants(filters),
    // Independent of `page` by design, so it's fetched once per filter set and reused
    // across every page change instead of refetching alongside each page's row query.
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useRestaurant(objectId: string) {
  return useQuery({
    queryKey: queryKeys.restaurants.detail(objectId),
    queryFn: () => getRestaurant(objectId),
  });
}
