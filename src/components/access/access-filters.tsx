'use client';

import { useEffect, useState } from 'react';
import { Button, SearchField } from '@heroui/react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useI18n } from '@/lib/i18n/provider';
import {
  ACCESS_OPTIONS,
  isDefaultFilters,
  type StaffFilters as Filters,
} from '@/lib/url/staff-filters';
import type { AccessFilter } from '@/lib/services/staff';
import { CloseIcon, SearchIcon } from '@/components/icons';

export function AccessFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const { t } = useI18n();
  const accessOptions: { key: AccessFilter; label: string }[] = ACCESS_OPTIONS.map((key) => ({
    key,
    label: t(`access.filters.${key}`),
  }));

  // Same debounce dance as RestaurantFilters: the search box can't write straight through
  // to the URL (a router push per keystroke would spam history and refetch on every
  // letter), so it holds its own value and commits on a pause, while still following the
  // URL when the filters change from outside — Clear, the back button, a pasted link.
  const urlSearch = filters.search ?? '';
  const [search, setSearch] = useState(urlSearch);
  const [syncedSearch, setSyncedSearch] = useState(urlSearch);

  // Adjusted during render rather than in an effect: React re-runs this component
  // immediately with the new value instead of painting the stale one first, and it can't
  // clobber what the user is mid-way through typing, because it only fires when the URL
  // itself changed.
  if (syncedSearch !== urlSearch) {
    setSyncedSearch(urlSearch);
    setSearch(urlSearch);
  }

  useEffect(() => {
    if (search === urlSearch) return;

    const timer = setTimeout(
      () => onChange({ ...filters, search: search.trim() || undefined }),
      300,
    );
    return () => clearTimeout(timer);
    // `onChange` and `filters` are read fresh on each run; re-arming the timer whenever
    // they change would restart the debounce on unrelated filter edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchField
        aria-label={t('access.filters.searchLabel')}
        value={search}
        onChange={setSearch}
        className="w-full sm:w-56"
      >
        <SearchField.Group>
          <SearchField.SearchIcon>
            <SearchIcon className="size-4" />
          </SearchField.SearchIcon>
          <SearchField.Input placeholder={t('access.filters.searchPlaceholder')} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      <SegmentedControl
        label={t('access.filters.access')}
        options={accessOptions}
        value={filters.access}
        onChange={(access) => onChange({ ...filters, access })}
      />

      {!isDefaultFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onPress={() => onChange({ access: 'all' })}
          aria-label={t('common.clearFilters')}
        >
          <CloseIcon className="size-3.5" />
          {t('common.clear')}
        </Button>
      )}
    </div>
  );
}
