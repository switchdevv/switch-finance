'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Chip, Skeleton, Table } from '@heroui/react';
import { useCities } from '@/hooks/use-cities';
import { useDrivers } from '@/hooks/use-drivers';
import { useDriverWallets } from '@/hooks/use-driver-wallets';
import { driverWalletState, enforcementOf } from '@/lib/finance/wallet';
import { formatOrNone, initials } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';
import { parseErrorKey, walletErrorKey } from '@/lib/parse/errors';
import {
  driverFiltersToQuery,
  parseDriverFilters,
  type DriverFilters as Filters,
} from '@/lib/url/driver-filters';
import { driverDetailHref } from '@/lib/url/routes';
import type { Driver } from '@/types/driver';
import type { WalletConfig, WalletSummary } from '@/types/wallet';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { StatTile } from '@/components/ui/stat-tile';
import { DriverFilters } from '@/components/drivers/driver-filters';
import { WalletStateChip } from '@/components/drivers/wallet-state-chip';
import { BanIcon, ChevronRightIcon, FilterIcon, WalletIcon } from '@/components/icons';

export const DRIVER_PAGE_SIZE = 25;

const COLUMNS = [
  { key: 'driver', className: 'min-w-[14rem] text-start' },
  { key: 'city', className: 'w-[8rem] text-start' },
  { key: 'wallet', className: 'w-[9rem] text-start' },
  { key: 'value', className: 'w-[8rem] text-end' },
  { key: 'price', className: 'w-[7rem] text-end' },
  { key: 'lastTopUp', className: 'w-[10rem] text-start' },
  { key: 'account', className: 'w-[8rem] text-start' },
] as const;

function parsePage(raw: string | null): number {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function matches(
  driver: Driver,
  filters: Filters,
  wallets: ReadonlyMap<string, WalletSummary> | null,
): boolean {
  if (filters.city && driver.city?.objectId !== filters.city) return false;
  if (filters.state !== 'all') {
    // Until the wallets are known, a state filter can't say which drivers pass.
    if (!wallets) return false;
    if (driverWalletState(wallets.get(driver.objectId)) !== filters.state) return false;
  }
  const search = filters.search?.toLowerCase();
  if (!search) return true;
  const compact = search.replace(/\s/g, '');
  return (
    (driver.fullname ?? '').toLowerCase().includes(search) ||
    (driver.username ?? '').toLowerCase().includes(search) ||
    (driver.phone ?? '').replace(/\s/g, '').includes(compact)
  );
}

/**
 * Every driver with their prepaid wallet: the whole fleet is read at once and joined to the
 * wallets here, then searched, filtered and paged in the browser, like switch-ops' Drivers
 * screen. The wallet figures are the server's (D-25); this only lays them out.
 */
export function DriversTable() {
  const { t, format } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const filters = parseDriverFilters(searchParams);

  const driversQuery = useDrivers();
  const walletsQuery = useDriverWallets();
  const cities = useCities();

  const wallets = useMemo(
    () =>
      walletsQuery.data
        ? new Map(walletsQuery.data.wallets.map((wallet) => [wallet.driverId, wallet]))
        : null,
    [walletsQuery.data],
  );
  const cityNames = useMemo(
    () => new Map((cities.data ?? []).map((city) => [city.objectId, city.name])),
    [cities.data],
  );

  const filtered = useMemo(
    () => (driversQuery.data ?? []).filter((driver) => matches(driver, filters, wallets)),
    // `filters` is rebuilt from the URL on every render; its fields are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [driversQuery.data, wallets, filters.search, filters.city, filters.state],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / DRIVER_PAGE_SIZE));

  const buildHref = (target: number, next: Filters = filters) => {
    const query = driverFiltersToQuery(next);
    const parts = [target > 1 ? `page=${target}` : '', query].filter(Boolean);
    return parts.length > 0 ? `${pathname}?${parts.join('&')}` : pathname;
  };

  // A stale link can point past the last page once the list is known — clamp it.
  useEffect(() => {
    if (driversQuery.status === 'success' && page > totalPages) {
      router.replace(buildHref(totalPages));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driversQuery.status, page, totalPages]);

  const filterBar = (
    <DriverFilters filters={filters} onChange={(next) => router.push(buildHref(1, next))} />
  );

  return (
    <div className="flex flex-col gap-6">
      <WalletOverview
        drivers={driversQuery.data}
        wallets={wallets}
        config={walletsQuery.data?.config}
        cityNames={cityNames}
        isPending={walletsQuery.status === 'pending' || driversQuery.status === 'pending'}
      />

      {walletsQuery.status === 'error' && (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>{t('drivers.walletsError')}</Alert.Title>
            <Alert.Description>{t(walletErrorKey(walletsQuery.error))}</Alert.Description>
          </Alert.Content>
          <Button variant="secondary" size="sm" onPress={() => walletsQuery.refetch()}>
            {t('common.retry')}
          </Button>
        </Alert>
      )}

      {driversQuery.status === 'pending' ? (
        <TableSkeleton filterBar={filterBar} />
      ) : driversQuery.status === 'error' ? (
        <div className="flex flex-col gap-4">
          {filterBar}
          <Alert status="danger">
            <Alert.Content>
              <Alert.Title>{t('drivers.loadError')}</Alert.Title>
              <Alert.Description>{t(parseErrorKey(driversQuery.error, 'fetch'))}</Alert.Description>
            </Alert.Content>
            <Button variant="secondary" size="sm" onPress={() => driversQuery.refetch()}>
              {t('common.retry')}
            </Button>
          </Alert>
        </div>
      ) : (
        <section className="border-border/70 bg-surface rounded-card shadow-card overflow-hidden border">
          <header className="border-separator/70 flex flex-col gap-3 border-b px-5 py-4">
            {filterBar}
            {filtered.length > 0 && (
              <span className="text-caption text-muted tabular">
                {t('common.showingOf', {
                  start: format.number((page - 1) * DRIVER_PAGE_SIZE + 1),
                  end: format.number(Math.min(page * DRIVER_PAGE_SIZE, filtered.length)),
                  total: format.number(filtered.length),
                })}
              </span>
            )}
          </header>

          {filtered.length === 0 ? (
            <EmptyRows />
          ) : (
            <Table variant="secondary" className="px-3 pb-1">
              <Table.ScrollContainer>
                <Table.Content aria-label={t('drivers.tableLabel')} className="min-w-[58rem]">
                  <Table.Header>
                    {COLUMNS.map((column) => (
                      <Table.Column
                        key={column.key}
                        isRowHeader={column.key === 'driver'}
                        className={`text-micro tracking-[0.12em] uppercase ${column.className}`}
                      >
                        {t(`drivers.columns.${column.key}`)}
                      </Table.Column>
                    ))}
                    <Table.Column className="w-12">
                      <span className="sr-only">{t('drivers.columns.open')}</span>
                    </Table.Column>
                  </Table.Header>
                  <Table.Body
                    items={filtered.slice(
                      (page - 1) * DRIVER_PAGE_SIZE,
                      page * DRIVER_PAGE_SIZE,
                    )}
                    // The rows are cached by item: the wallets and the city names arrive after
                    // the drivers, and without these the cells drawn before them never redraw.
                    dependencies={[wallets, cityNames, page]}
                  >
                    {(driver: Driver) => (
                      <Table.Row id={driver.objectId}>
                        <Table.Cell>
                          <DriverCell driver={driver} backHref={buildHref(page)} />
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap">
                          <span className="text-body">
                            {(driver.city && cityNames.get(driver.city.objectId)) ||
                              t('drivers.noCity')}
                          </span>
                        </Table.Cell>
                        {/* Four cells written out, not returned from one component: the
                            table builds its collection from the row's direct children. */}
                        <Table.Cell className="whitespace-nowrap">
                          <WalletCell wallet={wallets?.get(driver.objectId)} isKnown={!!wallets} />
                        </Table.Cell>
                        <Table.Cell className="text-end whitespace-nowrap">
                          <ValueCell wallet={wallets?.get(driver.objectId)} />
                        </Table.Cell>
                        <Table.Cell className="text-end whitespace-nowrap">
                          <PriceCell wallet={wallets?.get(driver.objectId)} />
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap">
                          <LastTopUpCell wallet={wallets?.get(driver.objectId)} isKnown={!!wallets} />
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap">
                          <AccountChip driver={driver} />
                        </Table.Cell>
                        <Table.Cell>
                          <Link
                            href={driverDetailHref(driver.objectId, buildHref(page))}
                            aria-label={t('drivers.openRow', {
                              name: formatOrNone(driver.fullname ?? driver.username),
                            })}
                            className="text-muted hover:bg-accent-soft hover:text-accent-soft-foreground focus-visible:ring-focus grid size-8 place-items-center rounded-lg transition-colors outline-none focus-visible:ring-2"
                          >
                            <ChevronRightIcon className="size-4" />
                          </Link>
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}

          <PaginationBar
            page={page}
            totalPages={totalPages}
            hasNext={page < totalPages}
            isFetching={driversQuery.isFetching}
            onChange={(target) => router.push(buildHref(target))}
          />
        </section>
      )}
    </div>
  );
}

/**
 * The fleet's wallets at a glance, and whether they are enforced — the one setting that
 * changes what a driver can do, so it is stated above everything else.
 */
function WalletOverview({
  drivers,
  wallets,
  config,
  cityNames,
  isPending,
}: {
  drivers: Driver[] | undefined;
  wallets: ReadonlyMap<string, WalletSummary> | null;
  config: WalletConfig | undefined;
  cityNames: ReadonlyMap<string, string | undefined>;
  isPending: boolean;
}) {
  const { t, tCount, format } = useI18n();

  const figures = useMemo(() => {
    let held = 0;
    let low = 0;
    let empty = 0;
    let none = 0;
    let currency: WalletSummary['currency'] = null;
    for (const driver of drivers ?? []) {
      const wallet = wallets?.get(driver.objectId);
      const state = driverWalletState(wallet);
      if (state === 'none') {
        if (driver.enabled !== false) none += 1;
        continue;
      }
      currency ??= wallet!.currency;
      if (wallet!.value > 0) held += wallet!.value;
      if (state === 'low') low += 1;
      if (state === 'empty') empty += 1;
    }
    return { held, low, empty, none, currency: currency ?? undefined };
  }, [drivers, wallets]);

  const orders = (count: number) => tCount('wallet.orders', count, { count: format.number(count) });

  return (
    <div className="flex flex-col gap-4">
      {config && <EnforcementNotice config={config} cityNames={cityNames} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={WalletIcon}
          label={t('drivers.tiles.held')}
          value={format.money(figures.held, figures.currency)}
          hint={t('drivers.tiles.heldHint')}
          isPending={isPending}
        />
        <StatTile
          icon={WalletIcon}
          label={t('drivers.tiles.low')}
          value={format.number(figures.low)}
          hint={
            !config
              ? undefined
              : Object.values(config.regions).some((region) => region.lowOrders !== undefined)
                ? t('drivers.tiles.lowHintRegions')
                : t('drivers.tiles.lowHint', { orders: orders(config.lowOrders) })
          }
          isPending={isPending}
        />
        <StatTile
          icon={BanIcon}
          label={t('drivers.tiles.empty')}
          value={format.number(figures.empty)}
          hint={t('drivers.tiles.emptyHint')}
          isPending={isPending}
        />
        <StatTile
          icon={FilterIcon}
          label={t('drivers.tiles.none')}
          value={format.number(figures.none)}
          hint={t('drivers.tiles.noneHint')}
          isPending={isPending}
        />
      </div>
    </div>
  );
}

/**
 * Where wallets are enforced, in one line: everywhere, nowhere, only in some regions, or
 * everywhere but some — the one setting that changes what a driver can do.
 */
function EnforcementNotice({
  config,
  cityNames,
}: {
  config: WalletConfig;
  cityNames: ReadonlyMap<string, string | undefined>;
}) {
  const { t, tCount, format } = useI18n();
  const enforcement = enforcementOf(config);
  const orders = (count: number) => tCount('wallet.orders', count, { count: format.number(count) });
  const names =
    enforcement.kind === 'except'
      ? enforcement.cityIds.map((id) => cityNames.get(id) ?? id).join(', ')
      : '';
  const rules = t('drivers.enforcedBody', {
    min: orders(config.minOrders),
    low: orders(config.lowOrders),
  });

  const copy = {
    everywhere: { status: 'accent', title: t('drivers.enforcedTitle'), body: rules },
    nowhere: {
      status: 'warning',
      title: t('drivers.notEnforcedTitle'),
      body: t('drivers.notEnforcedBody'),
    },
    except: {
      status: 'accent',
      title: t('drivers.enforcedExceptTitle', { regions: names }),
      body: rules,
    },
  } as const;
  const { status, title, body } = copy[enforcement.kind];

  return (
    <Alert status={status}>
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{body}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

function DriverCell({ driver, backHref }: { driver: Driver; backHref: string }) {
  const name = formatOrNone(driver.fullname ?? driver.username);
  return (
    <div className="flex items-center gap-3">
      {driver.picture?.url ? (
        // Plain <img>, not next/image — see the note on the restaurant thumbnail.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={driver.picture.url}
          alt=""
          loading="lazy"
          className="ring-border/70 size-10 shrink-0 rounded-xl object-cover ring-1"
        />
      ) : (
        <span className="bg-accent-soft text-accent-soft-foreground text-caption grid size-10 shrink-0 place-items-center rounded-xl font-bold">
          {initials(driver.fullname ?? driver.username)}
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <Link
          href={driverDetailHref(driver.objectId, backHref)}
          className="text-body hover:text-accent-soft-foreground truncate font-bold transition-colors"
        >
          {name}
        </Link>
        <span className="text-caption text-muted tabular truncate">
          {driver.phone?.trim() || driver.username || '—'}
        </span>
      </span>
    </div>
  );
}

function WalletCell({ wallet, isKnown }: { wallet: WalletSummary | undefined; isKnown: boolean }) {
  if (!isKnown) return <span className="text-muted">—</span>;
  return (
    <WalletStateChip state={driverWalletState(wallet)} ordersLeft={wallet?.ordersLeft} size="sm" />
  );
}

function ValueCell({ wallet }: { wallet: WalletSummary | undefined }) {
  const { format } = useI18n();
  if (!wallet) return <span className="text-muted">—</span>;
  return (
    <span className={`tabular font-bold ${wallet.value < 0 ? 'text-[var(--danger)]' : ''}`}>
      {format.money(wallet.value, wallet.currency ?? undefined)}
    </span>
  );
}

function PriceCell({ wallet }: { wallet: WalletSummary | undefined }) {
  const { format } = useI18n();
  if (!wallet?.unitPriceToday) return <span className="text-muted">—</span>;
  return (
    <span className="tabular text-muted">
      {format.money(wallet.unitPriceToday, wallet.currency ?? undefined)}
    </span>
  );
}

function LastTopUpCell({
  wallet,
  isKnown,
}: {
  wallet: WalletSummary | undefined;
  isKnown: boolean;
}) {
  const { t, tCount, format } = useI18n();
  if (!isKnown) return <span className="text-muted">—</span>;
  if (!wallet?.lastTopUp) return <span className="text-caption text-muted">{t('drivers.never')}</span>;
  return (
    <span className="flex flex-col">
      <span className="text-body tabular">
        {tCount('wallet.orders', wallet.lastTopUp.orders, {
          count: format.number(wallet.lastTopUp.orders),
        })}
      </span>
      <span className="text-caption text-muted tabular">{format.date(wallet.lastTopUp.at)}</span>
    </span>
  );
}

/** Deactivated, or the driver's own online switch (a hint: it is read once a minute). */
export function AccountChip({ driver, size = 'sm' }: { driver: Driver; size?: 'sm' | 'md' | 'lg' }) {
  const { t } = useI18n();
  const state =
    driver.enabled === false ? 'deactivated' : driver.driverActive ? 'online' : 'offline';
  const color = state === 'online' ? 'success' : 'default';
  return (
    <Chip color={color} variant="soft" size={size} className="gap-1.5 ps-2">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      <Chip.Label>{t(`drivers.account.${state}`)}</Chip.Label>
    </Chip>
  );
}

function EmptyRows() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
      <span className="bg-surface-secondary text-muted mb-2 grid size-12 place-items-center rounded-2xl">
        <FilterIcon className="size-6" />
      </span>
      <p className="text-h6 font-bold">{t('drivers.emptyTitle')}</p>
      <p className="text-muted text-body">{t('drivers.emptyBody')}</p>
    </div>
  );
}

function TableSkeleton({ filterBar }: { filterBar: ReactNode }) {
  return (
    <section className="border-border/70 bg-surface rounded-card shadow-card overflow-hidden border">
      <div className="border-separator/70 border-b px-5 py-4">{filterBar}</div>
      <div className="flex flex-col">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-separator/50 flex items-center gap-4 border-b px-5 py-3.5">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <Skeleton className="h-4 flex-1 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-pill" />
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-pill" />
          </div>
        ))}
      </div>
    </section>
  );
}
