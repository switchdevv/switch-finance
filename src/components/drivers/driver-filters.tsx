'use client';

import { useEffect, useState } from 'react';
import { Button, ListBox, SearchField, Select } from '@heroui/react';
import { useCities } from '@/hooks/use-cities';
import { useI18n } from '@/lib/i18n/provider';
import {
  DEFAULT_DRIVER_FILTERS,
  DRIVER_STATE_OPTIONS,
  isDefaultDriverFilters,
  type DriverFilters as Filters,
  type DriverStateFilter,
} from '@/lib/url/driver-filters';
import { CloseIcon, SearchIcon } from '@/components/icons';

const ALL_CITIES = '__all__';

/** Search, city and wallet state — the restaurants directory's filter bar, for drivers. */
export function DriverFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const { t } = useI18n();
  const cities = useCities();

  // As in RestaurantFilters: the box keeps its own value and commits on a pause, and
  // follows the URL when the filters change from outside.
  const urlSearch = filters.search ?? '';
  const [search, setSearch] = useState(urlSearch);
  const [syncedSearch, setSyncedSearch] = useState(urlSearch);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchField
        aria-label={t('drivers.filters.searchLabel')}
        value={search}
        onChange={setSearch}
        className="w-full sm:w-64"
      >
        <SearchField.Group>
          <SearchField.SearchIcon>
            <SearchIcon className="size-4" />
          </SearchField.SearchIcon>
          <SearchField.Input placeholder={t('drivers.filters.searchPlaceholder')} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      <Select
        aria-label={t('drivers.filters.state')}
        selectedKey={filters.state}
        onSelectionChange={(key) => onChange({ ...filters, state: key as DriverStateFilter })}
        className="w-44"
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {DRIVER_STATE_OPTIONS.map((state) => (
              <ListBox.Item key={state} id={state} textValue={t(`drivers.state.${state}`)}>
                {t(`drivers.state.${state}`)}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <Select
        aria-label={t('drivers.filters.city')}
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
            <ListBox.Item id={ALL_CITIES} textValue={t('drivers.filters.allCities')}>
              {t('drivers.filters.allCities')}
            </ListBox.Item>
            {(cities.data ?? []).map((city) => (
              <ListBox.Item key={city.objectId} id={city.objectId} textValue={city.name ?? '—'}>
                {city.name ?? '—'}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      {!isDefaultDriverFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onPress={() => onChange(DEFAULT_DRIVER_FILTERS)}
          aria-label={t('common.clearFilters')}
        >
          <CloseIcon className="size-3.5" />
          {t('common.clear')}
        </Button>
      )}
    </div>
  );
}
