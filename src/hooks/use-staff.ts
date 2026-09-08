'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import {
  countStaff,
  DEFAULT_FILTERS,
  listStaff,
  STAFF_PAGE_SIZE,
  type StaffFilters,
} from '@/lib/services/staff';

export { STAFF_PAGE_SIZE };

export function useStaff(
  page: number,
  filters: StaffFilters = DEFAULT_FILTERS,
  pageSize: number = STAFF_PAGE_SIZE,
) {
  return useQuery({
    queryKey: queryKeys.staff.list(page, pageSize, filters),
    queryFn: () => listStaff({ page, pageSize, filters }),
    // Same reasoning as the restaurants list: keeps the current rows on screen while the
    // next page or filter set loads, and lets React Query discard a superseded response
    // so fast typing in the search box can't render an earlier keystroke's results.
    placeholderData: keepPreviousData,
  });
}

export function useStaffCount(filters: StaffFilters = DEFAULT_FILTERS) {
  return useQuery({
    queryKey: queryKeys.staff.count(filters),
    queryFn: () => countStaff(filters),
    // Independent of `page`, so it's fetched once per filter set rather than alongside
    // every page change.
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
