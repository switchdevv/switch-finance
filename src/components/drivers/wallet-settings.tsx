'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  buttonVariants,
  Checkbox,
  Description,
  Label,
  ListBox,
  NumberField,
  SearchField,
  Select,
  Skeleton,
  Switch,
  Typography,
} from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccess } from '@/hooks/use-access';
import { useCities } from '@/hooks/use-cities';
import { useDrivers } from '@/hooks/use-drivers';
import { useDriverWallets, useSaveWalletConfig } from '@/hooks/use-driver-wallets';
import {
  isWalletSettingsValid,
  mergeWalletConfig,
  onlineWithoutEnough,
  sameRegion,
  walletSettingsFor,
} from '@/lib/finance/wallet';
import { useI18n } from '@/lib/i18n/provider';
import { walletErrorKey } from '@/lib/parse/errors';
import { queryKeys } from '@/lib/query/keys';
import { listDriverWallets } from '@/lib/services/wallets';
import { DRIVERS_HREF, WALLET_SETTINGS_HREF } from '@/lib/url/routes';
import type { City } from '@/types/city';
import type { Driver } from '@/types/driver';
import type { RegionWalletSettings, WalletConfig, WalletSettings } from '@/types/wallet';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ArrowLeftIcon, CloseIcon, SearchIcon, SlidersIcon } from '@/components/icons';

/**
 * The link in the Drivers page header — admins only; the page refuses anyone else anyway.
 */
export function WalletSettingsLink() {
  const { t } = useI18n();
  const { role } = useAccess();
  if (role !== 'admin') return null;
  return (
    <Link href={WALLET_SETTINGS_HREF} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
      <SlidersIcon className="size-4" />
      {t('wallet.settings.open')}
    </Link>
  );
}

/**
 * Admins' rules for the wallet scheme: the master switch and the global thresholds, then every
 * region's own — Included or Left out, and thresholds that replace the global ones for its
 * drivers. Stored in Parse Config `driverWallet` (through the admin-only `updateConfigs`) and
 * read by the server on every check.
 *
 * Built for hundreds of regions: they are searched, filtered (own rules, left out, changed,
 * needing attention) and paged in the browser, picked in bulk, and edited in a draft that is
 * saved once from the bar at the foot of the page. Because the key is written whole, saving
 * re-reads it first and applies only what changed here onto what is there now, so two admins
 * editing different regions don't erase each other (lib/finance/wallet.ts#mergeWalletConfig).
 */
export function WalletSettings() {
  const { t } = useI18n();
  const wallets = useDriverWallets();
  // Lifted from the editor so the back link can ask before dropping unsaved edits.
  const [isDirty, setIsDirty] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <BackLink isDirty={isDirty} />
        <div className="min-w-0">
          <span className="text-micro text-accent-soft-foreground font-bold tracking-[0.18em] uppercase">
            {t('drivers.title')}
          </span>
          <Typography.Heading level={1} className="text-h2 mt-1.5 font-bold tracking-tight">
            {t('wallet.settings.title')}
          </Typography.Heading>
          <Typography.Paragraph className="text-muted text-body mt-2 max-w-prose">
            {t('wallet.settings.subtitle')}
          </Typography.Paragraph>
        </div>
      </div>

      {wallets.status === 'pending' ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="rounded-card h-56 w-full" />
          <Skeleton className="rounded-card h-96 w-full" />
        </div>
      ) : wallets.status === 'error' ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>{t('drivers.walletsError')}</Alert.Title>
            <Alert.Description>{t(walletErrorKey(wallets.error))}</Alert.Description>
          </Alert.Content>
          <Button variant="secondary" size="sm" onPress={() => wallets.refetch()}>
            {t('common.retry')}
          </Button>
        </Alert>
      ) : (
        <Editor initial={wallets.data.config} onDirtyChange={setIsDirty} />
      )}
    </div>
  );
}

type RegionFilter = 'all' | 'own' | 'leftOut' | 'changed' | 'invalid';
type RegionSort = 'name' | 'drivers';

const PAGE_SIZE = 25;

/** A region's values with the unset ones dropped, so the saved config only holds real choices. */
function compact(region: RegionWalletSettings): RegionWalletSettings {
  return Object.fromEntries(
    Object.entries(region).filter(([, value]) => value !== undefined),
  ) as RegionWalletSettings;
}

function withRegion(config: WalletConfig, cityId: string, next: RegionWalletSettings): WalletConfig {
  const regions = { ...config.regions };
  const kept = compact(next);
  if (Object.keys(kept).length > 0) regions[cityId] = kept;
  else delete regions[cityId];
  return { ...config, regions };
}

function Editor({
  initial,
  onDirtyChange,
}: {
  initial: WalletConfig;
  onDirtyChange: (isDirty: boolean) => void;
}) {
  const { t, tCount, format } = useI18n();
  const queryClient = useQueryClient();
  const save = useSaveWalletConfig();
  const cities = useCities();
  const drivers = useDrivers();
  const wallets = useDriverWallets();

  /** What the server held when this page last read or wrote it — what "changed" is measured
   * against, and what a save merges from. */
  const [baseline, setBaseline] = useState<WalletConfig>(initial);
  const [draft, setDraft] = useState<WalletConfig>(initial);
  const [merged, setMerged] = useState(false);
  const [saved, setSaved] = useState(false);
  const [readError, setReadError] = useState<unknown>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RegionFilter>('all');
  const [sort, setSort] = useState<RegionSort>('name');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const cityList = useMemo(() => cities.data ?? [], [cities.data]);

  // ---- what the draft changes ------------------------------------------------
  const globalChanges =
    Number(draft.enforced !== baseline.enforced) +
    Number(draft.minOrders !== baseline.minOrders) +
    Number(draft.lowOrders !== baseline.lowOrders);
  const changedRegions = useMemo(() => {
    const ids = new Set([...Object.keys(draft.regions), ...Object.keys(baseline.regions)]);
    return new Set([...ids].filter((id) => !sameRegion(draft.regions[id], baseline.regions[id])));
  }, [draft.regions, baseline.regions]);
  const changeCount = globalChanges + changedRegions.size;
  const isDirty = changeCount > 0;

  // Every region is checked with the global values it inherits, so a global change that
  // leaves a region's own warning under its minimum can't be saved either.
  const invalidRegions = useMemo(
    () =>
      new Set(
        cityList
          .filter((city) => !isWalletSettingsValid(walletSettingsFor(draft, city.objectId)))
          .map((city) => city.objectId),
      ),
    [cityList, draft],
  );
  const globalValid = isWalletSettingsValid(draft);
  const valid = globalValid && invalidRegions.size === 0;

  // ---- who is where -----------------------------------------------------------
  const driversByCity = useMemo(() => {
    const counts = new Map<string, number>();
    for (const driver of drivers.data ?? []) {
      if (driver.enabled === false || !driver.city) continue;
      counts.set(driver.city.objectId, (counts.get(driver.city.objectId) ?? 0) + 1);
    }
    return counts;
  }, [drivers.data]);

  // Who the draft would stop at their next attempt to go online — shown before it is saved,
  // so nobody is surprised by a driver calling in.
  const affected = useMemo(() => {
    if (!drivers.data || !wallets.data) return [];
    const byId = new Map(wallets.data.wallets.map((wallet) => [wallet.driverId, wallet]));
    return onlineWithoutEnough(drivers.data, byId, draft);
  }, [draft, drivers.data, wallets.data]);
  const affectedByCity = useMemo(() => {
    const counts = new Map<string, number>();
    for (const driver of affected) {
      const id = driver.city?.objectId ?? '';
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [affected]);

  // ---- the region list ----------------------------------------------------------
  const counts = useMemo(
    () => ({
      own: cityList.filter((city) => draft.regions[city.objectId]).length,
      leftOut: cityList.filter((city) => draft.regions[city.objectId]?.enforced === false).length,
    }),
    [cityList, draft.regions],
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = cityList.filter((city) => {
      if (needle && !(city.name ?? '').toLowerCase().includes(needle)) return false;
      const region = draft.regions[city.objectId];
      switch (filter) {
        case 'own':
          return !!region;
        case 'leftOut':
          return region?.enforced === false;
        case 'changed':
          return changedRegions.has(city.objectId);
        case 'invalid':
          return invalidRegions.has(city.objectId);
        default:
          return true;
      }
    });
    if (sort === 'drivers') {
      rows.sort(
        (a, b) =>
          (driversByCity.get(b.objectId) ?? 0) - (driversByCity.get(a.objectId) ?? 0) ||
          (a.name ?? '').localeCompare(b.name ?? ''),
      );
    }
    return rows;
  }, [cityList, search, filter, sort, draft.regions, changedRegions, invalidRegions, driversByCity]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // A filter that no longer applies (nothing changed, nothing invalid) falls back to All.
  const filters: RegionFilter[] = [
    'all',
    'own',
    'leftOut',
    ...(changedRegions.size > 0 || filter === 'changed' ? (['changed'] as const) : []),
    ...(invalidRegions.size > 0 || filter === 'invalid' ? (['invalid'] as const) : []),
  ];

  const selectedVisible = visible.filter((city) => selected.has(city.objectId));
  const allVisibleSelected = visible.length > 0 && selectedVisible.length === visible.length;

  const update = (next: WalletConfig) => {
    setDraft(next);
    setSaved(false);
  };
  const setRegion = (cityId: string, next: RegionWalletSettings) =>
    update(withRegion(draft, cityId, next));
  const applyToSelected = (change: (region: RegionWalletSettings) => RegionWalletSettings) => {
    let next = draft;
    for (const id of selected) next = withRegion(next, id, change(next.regions[id] ?? {}));
    update(next);
  };

  // Leaving with unsaved edits asks first — a reload or a closed tab would lose them.
  useEffect(() => {
    onDirtyChange(isDirty);
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty, onDirtyChange]);

  const onSave = async () => {
    setMerged(false);
    setReadError(null);
    let latest: WalletConfig;
    try {
      latest = (
        await queryClient.fetchQuery({
          queryKey: queryKeys.wallets.list(),
          queryFn: listDriverWallets,
          staleTime: 0,
        })
      ).config;
    } catch (error) {
      setReadError(error);
      return;
    }
    const next = mergeWalletConfig(baseline, draft, latest);
    const theirs = JSON.stringify(latest) !== JSON.stringify(baseline);
    save.mutate(next, {
      onSuccess: () => {
        setBaseline(next);
        setDraft(next);
        setMerged(theirs);
        setSaved(true);
      },
    });
  };

  const orders = (count: number) => tCount('wallet.orders', count, { count: format.number(count) });

  return (
    <>
      {/* ---- all regions -------------------------------------------------------- */}
      <Panel title={t('wallet.settings.global')} hint={t('wallet.settings.globalHint')}>
        <Switch isSelected={draft.enforced} onChange={(enforced) => update({ ...draft, enforced })}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Label className="text-body font-bold">{t('wallet.settings.enforced')}</Label>
          </Switch.Content>
          <Description>{t('wallet.settings.enforcedHint')}</Description>
        </Switch>

        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
          <CountField
            label={t('wallet.settings.minOrders')}
            value={draft.minOrders}
            onChange={(minOrders) => update({ ...draft, minOrders: minOrders ?? 0 })}
          />
          <CountField
            label={t('wallet.settings.lowOrders')}
            value={draft.lowOrders}
            onChange={(lowOrders) => update({ ...draft, lowOrders: lowOrders ?? 0 })}
          />
        </div>
        <p className={`text-caption ${globalValid ? 'text-muted' : 'text-[var(--danger)]'}`}>
          {globalValid
            ? t('wallet.settings.summary', { min: orders(draft.minOrders), low: orders(draft.lowOrders) })
            : t('wallet.settings.invalid')}
        </p>

        {affected.length > 0 && (
          <Alert status="warning">
            <Alert.Content>
              <Alert.Description>
                {tCount('wallet.settings.affected', affected.length, {
                  count: format.number(affected.length),
                })}{' '}
                <AffectedNames drivers={affected} />
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}
      </Panel>

      {/* ---- by region -------------------------------------------------------------- */}
      <section className="border-border/70 bg-surface rounded-card shadow-card overflow-hidden border">
        <header className="border-separator/70 flex flex-col gap-3 border-b px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-h6 font-bold">{t('wallet.settings.regions')}</h2>
            <p className="text-caption text-muted">
              {t('wallet.settings.regionCounts', {
                total: format.number(cityList.length),
                own: format.number(counts.own),
                leftOut: format.number(counts.leftOut),
              })}
            </p>
            <p className="text-caption text-muted max-w-prose">{t('wallet.settings.regionsHint')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SearchField
              aria-label={t('wallet.settings.searchLabel')}
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              className="w-full sm:w-64"
            >
              <SearchField.Group>
                <SearchField.SearchIcon>
                  <SearchIcon className="size-4" />
                </SearchField.SearchIcon>
                <SearchField.Input placeholder={t('wallet.settings.searchPlaceholder')} />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <div className="max-w-full overflow-x-auto">
              <SegmentedControl
                label={t('wallet.settings.filterLabel')}
                options={filters.map((key) => ({
                  key,
                  label: t(`wallet.settings.filters.${key}`, {
                    count: format.number(
                      key === 'changed' ? changedRegions.size : key === 'invalid' ? invalidRegions.size : 0,
                    ),
                  }),
                }))}
                value={filter}
                onChange={(next) => {
                  setFilter(next);
                  setPage(1);
                }}
              />
            </div>
            <Select
              aria-label={t('wallet.settings.sortLabel')}
              selectedKey={sort}
              onSelectionChange={(key) => setSort(key as RegionSort)}
              className="w-44"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(['name', 'drivers'] as const).map((key) => (
                    <ListBox.Item key={key} id={key} textValue={t(`wallet.settings.sort.${key}`)}>
                      {t(`wallet.settings.sort.${key}`)}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {selected.size > 0 && (
            <BulkBar
              count={selected.size}
              global={draft}
              onInclude={() => applyToSelected((region) => ({ ...region, enforced: undefined }))}
              onLeaveOut={() => applyToSelected((region) => ({ ...region, enforced: false }))}
              onReset={() => applyToSelected(() => ({}))}
              onThresholds={(minOrders, lowOrders) =>
                applyToSelected((region) => ({
                  ...region,
                  ...(minOrders !== undefined ? { minOrders } : {}),
                  ...(lowOrders !== undefined ? { lowOrders } : {}),
                }))
              }
              onClear={() => setSelected(new Set())}
            />
          )}
        </header>

        {cities.status === 'pending' ? (
          <div className="flex flex-col gap-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-body text-muted px-5 py-14 text-center">{t('wallet.settings.noRegions')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem]">
              <thead className="text-micro text-muted tracking-[0.12em] uppercase">
                <tr className="border-separator/70 border-b">
                  <th scope="col" className="w-12 px-5 py-2.5 text-start">
                    <Checkbox
                      aria-label={t('wallet.settings.selectAll', { count: format.number(visible.length) })}
                      isSelected={allVisibleSelected}
                      isIndeterminate={selectedVisible.length > 0 && !allVisibleSelected}
                      onChange={(isSelected) =>
                        setSelected((current) => {
                          const next = new Set(current);
                          for (const city of visible) {
                            if (isSelected) next.add(city.objectId);
                            else next.delete(city.objectId);
                          }
                          return next;
                        })
                      }
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                    </Checkbox>
                  </th>
                  <Th>{t('wallet.settings.columns.region')}</Th>
                  <Th className="w-[7rem] text-end">{t('wallet.settings.columns.drivers')}</Th>
                  <Th className="w-[13rem]">{t('wallet.settings.columns.wallets')}</Th>
                  <Th className="w-[9rem]">{t('wallet.settings.minOrdersShort')}</Th>
                  <Th className="w-[9rem]">{t('wallet.settings.lowOrdersShort')}</Th>
                  <Th className="w-[6rem]">
                    <span className="sr-only">{t('wallet.settings.columns.reset')}</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((city) => (
                  <RegionRow
                    key={city.objectId}
                    city={city}
                    global={draft}
                    region={draft.regions[city.objectId] ?? {}}
                    effective={walletSettingsFor(draft, city.objectId)}
                    drivers={driversByCity.get(city.objectId) ?? 0}
                    affected={affectedByCity.get(city.objectId) ?? 0}
                    isChanged={changedRegions.has(city.objectId)}
                    isSelected={selected.has(city.objectId)}
                    onSelect={(isSelected) =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (isSelected) next.add(city.objectId);
                        else next.delete(city.objectId);
                        return next;
                      })
                    }
                    onChange={(next) => setRegion(city.objectId, next)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <PaginationBar
          page={currentPage}
          totalPages={totalPages}
          hasNext={currentPage < totalPages}
          isFetching={false}
          onChange={setPage}
        />
      </section>

      {/* ---- save ------------------------------------------------------------------ */}
      <div className="sticky bottom-4 z-10">
        {(isDirty || save.isError || saved) && (
          <div className="border-border/70 bg-surface/95 rounded-card shadow-card flex flex-col gap-3 border px-5 py-3 backdrop-blur">
            {(save.isError || readError !== null) && (
              <Alert status="danger">
                <Alert.Content>
                  <Alert.Description>{t(walletErrorKey(save.error ?? readError))}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-caption">
                {isDirty ? (
                  <>
                    <strong>
                      {tCount('wallet.settings.changes', changeCount, { count: format.number(changeCount) })}
                    </strong>
                    {!valid && (
                      <span className="text-[var(--danger)]">
                        {' · '}
                        {invalidRegions.size > 0
                          ? tCount('wallet.settings.invalidRegions', invalidRegions.size, {
                              count: format.number(invalidRegions.size),
                            })
                          : t('wallet.settings.invalid')}
                      </span>
                    )}
                  </>
                ) : merged ? (
                  t('wallet.settings.savedMerged')
                ) : (
                  t('wallet.settings.saved')
                )}
              </p>
              {isDirty && (
                <div className="flex items-center gap-2">
                  {invalidRegions.size > 0 && filter !== 'invalid' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        setFilter('invalid');
                        setPage(1);
                      }}
                    >
                      {t('wallet.settings.showInvalid')}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    isDisabled={save.isPending}
                    onPress={() => {
                      setDraft(baseline);
                      save.reset();
                    }}
                  >
                    {t('wallet.settings.discard')}
                  </Button>
                  <Button variant="primary" size="sm" isDisabled={!valid || save.isPending} onPress={onSave}>
                    {save.isPending ? t('wallet.saving') : t('wallet.settings.submit')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** One region: included in the master switch or left out, and its own thresholds (empty
 * follows the global one, shown as the placeholder). */
function RegionRow({
  city,
  global,
  region,
  effective,
  drivers,
  affected,
  isChanged,
  isSelected,
  onSelect,
  onChange,
}: {
  city: City;
  global: WalletSettings;
  region: RegionWalletSettings;
  effective: WalletSettings;
  drivers: number;
  affected: number;
  isChanged: boolean;
  isSelected: boolean;
  onSelect: (isSelected: boolean) => void;
  onChange: (region: RegionWalletSettings) => void;
}) {
  const { t, tCount, format } = useI18n();
  const name = city.name ?? '—';
  const mode = region.enforced === false ? 'leftOut' : 'included';
  const isValid = isWalletSettingsValid(effective);
  const hasOwn = Object.keys(region).length > 0;
  const orders = (count: number) => tCount('wallet.orders', count, { count: format.number(count) });

  return (
    <tr
      className={
        'border-separator/50 border-b last:border-b-0 ' +
        (isSelected ? 'bg-accent-soft/40' : isChanged ? 'bg-warning-soft/30' : '')
      }
    >
      <td className="px-5 py-3 align-top">
        <Checkbox aria-label={t('wallet.settings.selectRegion', { name })} isSelected={isSelected} onChange={onSelect}>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
        </Checkbox>
      </td>
      <td className="px-3 py-3 align-top">
        <span className="text-body flex items-center gap-2 font-bold">
          {name}
          {isChanged && (
            <span className="text-micro text-warning-soft-foreground bg-warning-soft rounded-pill px-2 py-0.5 font-bold">
              {t('wallet.settings.changed')}
            </span>
          )}
        </span>
        <span className={`text-caption block ${isValid ? 'text-muted' : 'text-[var(--danger)]'}`}>
          {!isValid
            ? t('wallet.settings.invalid')
            : effective.enforced
              ? t('wallet.settings.regionOn', {
                  min: orders(effective.minOrders),
                  low: orders(effective.lowOrders),
                })
              : mode === 'leftOut'
                ? t('wallet.settings.regionLeftOut')
                : t('wallet.settings.regionOff')}
        </span>
        {affected > 0 && (
          <span className="text-caption text-warning-soft-foreground block font-bold">
            {tCount('wallet.settings.regionAffected', affected, { count: format.number(affected) })}
          </span>
        )}
      </td>
      <td className="text-body tabular px-3 py-3 text-end align-top">{format.number(drivers)}</td>
      <td className="px-3 py-3 align-top">
        <SegmentedControl
          label={t('wallet.settings.regionEnforcement', { name })}
          options={[
            { key: 'included', label: t('wallet.settings.included') },
            { key: 'leftOut', label: t('wallet.settings.leftOut') },
          ]}
          value={mode}
          onChange={(next) => onChange({ ...region, enforced: next === 'leftOut' ? false : undefined })}
        />
      </td>
      <td className="px-3 py-3 align-top">
        <CountField
          label={t('wallet.settings.regionMin', { name })}
          isLabelHidden
          value={region.minOrders}
          placeholder={format.number(global.minOrders)}
          onChange={(minOrders) => onChange({ ...region, minOrders })}
        />
      </td>
      <td className="px-3 py-3 align-top">
        <CountField
          label={t('wallet.settings.regionLow', { name })}
          isLabelHidden
          value={region.lowOrders}
          placeholder={format.number(global.lowOrders)}
          onChange={(lowOrders) => onChange({ ...region, lowOrders })}
        />
      </td>
      <td className="px-3 py-3 text-end align-top">
        {hasOwn && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('wallet.settings.resetRegion', { name })}
            onPress={() => onChange({})}
          >
            {t('wallet.settings.reset')}
          </Button>
        )}
      </td>
    </tr>
  );
}

/** What can be done to every picked region at once. */
function BulkBar({
  count,
  global,
  onInclude,
  onLeaveOut,
  onReset,
  onThresholds,
  onClear,
}: {
  count: number;
  global: WalletSettings;
  onInclude: () => void;
  onLeaveOut: () => void;
  onReset: () => void;
  onThresholds: (minOrders: number | undefined, lowOrders: number | undefined) => void;
  onClear: () => void;
}) {
  const { t, tCount, format } = useI18n();
  const [min, setMin] = useState<number | undefined>(undefined);
  const [low, setLow] = useState<number | undefined>(undefined);

  return (
    <div className="border-accent/40 bg-accent-soft/40 flex flex-col gap-3 rounded-xl border px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-caption font-bold">
          {tCount('wallet.settings.selected', count, { count: format.number(count) })}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onPress={onInclude}>
            {t('wallet.settings.bulk.include')}
          </Button>
          <Button variant="secondary" size="sm" onPress={onLeaveOut}>
            {t('wallet.settings.bulk.leaveOut')}
          </Button>
          <Button variant="secondary" size="sm" onPress={onReset}>
            {t('wallet.settings.bulk.reset')}
          </Button>
          <Button variant="ghost" size="sm" onPress={onClear}>
            <CloseIcon className="size-3.5" />
            {t('wallet.settings.bulk.clear')}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <CountField
          label={t('wallet.settings.minOrdersShort')}
          value={min}
          placeholder={format.number(global.minOrders)}
          onChange={setMin}
        />
        <CountField
          label={t('wallet.settings.lowOrdersShort')}
          value={low}
          placeholder={format.number(global.lowOrders)}
          onChange={setLow}
        />
        <Button
          variant="primary"
          size="sm"
          isDisabled={min === undefined && low === undefined}
          onPress={() => {
            onThresholds(min, low);
            setMin(undefined);
            setLow(undefined);
          }}
        >
          {t('wallet.settings.bulk.apply')}
        </Button>
      </div>
    </div>
  );
}

/** The first few names, so the warning is actionable without leaving the page. */
function AffectedNames({ drivers }: { drivers: Driver[] }) {
  const { t, format } = useI18n();
  const shown = drivers.slice(0, 5).map((driver) => driver.fullname ?? driver.username ?? '—');
  const rest = drivers.length - shown.length;
  return (
    <span className="font-bold">
      {shown.join(', ')}
      {rest > 0 && ` ${t('wallet.settings.andMore', { count: format.number(rest) })}`}
    </span>
  );
}

/** A count; `undefined` is an empty field — for a region, "the global value". */
function CountField({
  label,
  isLabelHidden,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  isLabelHidden?: boolean;
  value: number | undefined;
  placeholder?: string;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <NumberField
      // NaN is how the field is told it's empty.
      value={value ?? Number.NaN}
      onChange={(next) => onChange(Number.isFinite(next) ? next : undefined)}
      minValue={1}
      maxValue={1000}
      step={1}
      formatOptions={{ maximumFractionDigits: 0 }}
      fullWidth
    >
      <Label className={isLabelHidden ? 'sr-only' : undefined}>{label}</Label>
      <NumberField.Group>
        <NumberField.DecrementButton />
        <NumberField.Input placeholder={placeholder} className="min-w-10" />
        <NumberField.IncrementButton />
      </NumberField.Group>
    </NumberField>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-border/70 bg-surface rounded-card shadow-card flex flex-col gap-4 border p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-h6 font-bold">{title}</h2>
        {hint && <p className="text-caption text-muted max-w-prose">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th scope="col" className={`px-3 py-2.5 text-start font-bold ${className}`}>
      {children}
    </th>
  );
}

function BackLink({ isDirty }: { isDirty: boolean }) {
  const { t } = useI18n();
  return (
    <Link
      href={DRIVERS_HREF}
      onClick={(event) => {
        if (isDirty && !window.confirm(t('wallet.settings.leaveConfirm'))) event.preventDefault();
      }}
      className="text-caption text-muted hover:text-foreground hover:border-border-secondary border-border/70 bg-surface focus-visible:ring-focus flex w-fit items-center gap-2 rounded-pill border px-3 py-1.5 font-bold transition-colors outline-none focus-visible:ring-2"
    >
      <ArrowLeftIcon className="size-3.5" />
      {t('driver.back')}
    </Link>
  );
}
