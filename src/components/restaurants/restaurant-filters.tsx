'use client';

import { useEffect, useState } from 'react';
import { Button, ListBox, SearchField, Select, ToggleButton } from '@heroui/react';
import { useCities } from '@/hooks/use-cities';
import { useI18n } from '@/lib/i18n/provider';
import {
  FLAG_OPTIONS,
  isDefaultFilters,
  STATUS_OPTIONS,
  type RestaurantFilters as Filters,
} from '@/lib/url/restaurant-filters';
import type { RestaurantFlag, RestaurantStatus } from '@/lib/services/restaurants';
import { CloseIcon, SearchIcon } from '@/components/icons';

const ALL_CITIES = '__all__';

export function RestaurantFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const { t } = useI18n();
  const cities = useCities();

  // The search box is the one control that can't write straight through to the URL:
  // a router push per keystroke would spam history and refetch on every letter. It
  // keeps its own value and commits on a pause, while still following the URL when the
  // filters change from outside (Clear, the back button, a pasted link).
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

  const toggleFlag = (flag: RestaurantFlag, isSelected: boolean) => {
    const next = new Set(filters.flags ?? []);
    if (isSelected) next.add(flag);
    else next.delete(flag);
    onChange({ ...filters, flags: FLAG_OPTIONS.filter((option) => next.has(option)) });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchField
        aria-label={t('restaurants.filters.searchLabel')}
        value={search}
        onChange={setSearch}
        className="w-full sm:w-56"
      >
        <SearchField.Group>
          <SearchField.SearchIcon>
            <SearchIcon className="size-4" />
          </SearchField.SearchIcon>
          <SearchField.Input placeholder={t('restaurants.filters.searchPlaceholder')} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      <Select
        aria-label={t('restaurants.filters.status')}
        selectedKey={filters.status}
        onSelectionChange={(key) => onChange({ ...filters, status: key as RestaurantStatus })}
        className="w-40"
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {STATUS_OPTIONS.map((status) => (
              <ListBox.Item
                key={status}
                id={status}
                textValue={t(`restaurants.status.${status}`)}
              >
                {t(`restaurants.status.${status}`)}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <Select
        aria-label={t('restaurants.filters.city')}
        selectedKey={filters.city ?? ALL_CITIES}
        isDisabled={cities.status !== 'success'}
        onSelectionChange={(key) =>
          onChange({ ...filters, city: key === ALL_CITIES ? undefined : String(key) })
        }
        className="w-40"
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id={ALL_CITIES} textValue={t('restaurants.filters.allCities')}>
              {t('restaurants.filters.allCities')}
            </ListBox.Item>
            {/* Rendered as a flat list rather than <>{...}</> around a map: RAC reads the
                children to build its collection, and a fragment hides the items from it. */}
            {(cities.data ?? []).map((city) => (
              <ListBox.Item key={city.objectId} id={city.objectId} textValue={city.name ?? '—'}>
                {city.name ?? '—'}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <div className="flex items-center gap-1.5">
        {FLAG_OPTIONS.map((flag) => (
          <ToggleButton
            key={flag}
            size="sm"
            aria-label={t(`restaurants.flags.${flag}`)}
            isSelected={(filters.flags ?? []).includes(flag)}
            onChange={(isSelected) => toggleFlag(flag, isSelected)}
          >
            {t(`restaurants.flags.${flag}`)}
          </ToggleButton>
        ))}
      </div>

      {!isDefaultFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onPress={() => onChange({ status: 'live' })}
          aria-label={t('common.clearFilters')}
        >
          <CloseIcon className="size-3.5" />
          {t('common.clear')}
        </Button>
      )}
    </div>
  );
}
