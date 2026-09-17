'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Skeleton, Table } from '@heroui/react';
import { RESTAURANT_PAGE_SIZE, useRestaurants, useRestaurantsCount } from '@/hooks/use-restaurants';
import type { RestaurantFilters as Filters } from '@/lib/services/restaurants';
import {
  parseRestaurantFilters,
  restaurantFiltersToQuery,
} from '@/lib/url/restaurant-filters';
import { restaurantDetailHref } from '@/lib/url/routes';
import { formatOrNone, initials, splitPhones } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';
import { parseErrorKey } from '@/lib/parse/errors';
import type { Restaurant } from '@/types/restaurant';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { StatusChip } from '@/components/ui/status-chip';
import { RestaurantFilters } from '@/components/restaurants/restaurant-filters';
import { ChevronRightIcon, FilterIcon, StarIcon } from '@/components/icons';

const COLUMNS = [
  { key: 'name', className: 'min-w-[15rem] text-start' },
  { key: 'phone', className: 'w-[9.5rem] text-start' },
  { key: 'rating', className: 'w-[7.5rem] text-start' },
  { key: 'orders', className: 'w-[6rem] text-end' },
  { key: 'status', className: 'w-[8rem] text-start' },
  { key: 'created', className: 'w-[8.5rem] text-start' },
] as const;

function parsePage(raw: string | null): number {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function RestaurantsTable() {
  const { t, format } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const filters = parseRestaurantFilters(searchParams);

  const rowsQuery = useRestaurants(page, filters);
  const countQuery = useRestaurantsCount(filters);

  const totalPages =
    countQuery.status === 'success'
      ? Math.max(1, Math.ceil(countQuery.data / RESTAURANT_PAGE_SIZE))
      : null;

  // A deep link or a stale bookmark can point past the last page once the count
  // resolves — clamp rather than strand the user on a permanently empty grid.
  useEffect(() => {
    if (totalPages !== null && page > totalPages) {
      router.replace(`${pathname}?page=${totalPages}`);
    }
  }, [totalPages, page, pathname, router]);

  const buildHref = (target: number, next: Filters = filters) => {
    const query = restaurantFiltersToQuery(next);
    const parts = [target > 1 ? `page=${target}` : '', query].filter(Boolean);
    return parts.length > 0 ? `${pathname}?${parts.join('&')}` : pathname;
  };

  const goToPage = (target: number) => router.push(buildHref(target));
  // Any filter edit returns to page 1 — the page the user was on describes a different
  // result set once the filter changes, and landing on an empty page 7 reads as a bug.
  const applyFilters = (next: Filters) => router.push(buildHref(1, next));

  const filterBar = <RestaurantFilters filters={filters} onChange={applyFilters} />;

  if (rowsQuery.status === 'pending') {
    return <TableSkeleton filterBar={filterBar} />;
  }

  if (rowsQuery.status === 'error') {
    return (
      <div className="flex flex-col gap-4">
        {filterBar}
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>{t('restaurants.loadError')}</Alert.Title>
            <Alert.Description>{t(parseErrorKey(rowsQuery.error, 'fetch'))}</Alert.Description>
          </Alert.Content>
          <Button variant="secondary" size="sm" onPress={() => rowsQuery.refetch()}>
            {t('common.retry')}
          </Button>
        </Alert>
      </div>
    );
  }

  const rows = rowsQuery.data;
  const total = countQuery.status === 'success' ? countQuery.data : undefined;
  const rangeStart = (page - 1) * RESTAURANT_PAGE_SIZE + 1;
  const rangeEnd =
    total !== undefined ? Math.min(page * RESTAURANT_PAGE_SIZE, total) : rangeStart + rows.length - 1;

  return (
    // One card holds toolbar, grid and pager, so the three read as a single object
    // instead of three strips floating on the page background.
    <section className="border-border/70 bg-surface rounded-card shadow-card overflow-hidden border">
      <header className="border-separator/70 flex flex-col gap-3 border-b px-5 py-4">
        {filterBar}
        {rows.length > 0 && (
          <span className="text-caption text-muted tabular">
            {total !== undefined
              ? t('common.showingOf', {
                  start: format.number(rangeStart),
                  end: format.number(rangeEnd),
                  total: format.number(total),
                })
              : t('common.showing', {
                  start: format.number(rangeStart),
                  end: format.number(rangeEnd),
                })}
          </span>
        )}
      </header>

      {rows.length === 0 ? (
        <EmptyRows />
      ) : (
        // Table.Root is what publishes HeroUI's slot classes through context —
        // rendering ScrollContainer/Content on their own leaves every part of the
        // grid unstyled, which is why the columns had no padding or alignment.
        <Table variant="secondary" className="px-3 pb-1">
          <Table.ScrollContainer>
            <Table.Content
              aria-label={t('restaurants.tableLabel')}
              // While the next page is in flight the previous page stays mounted
              // (keepPreviousData); dimming it marks the rows as stale without the
              // layout collapse a skeleton swap would cause.
              className={
                'min-w-[50rem] ' +
                (rowsQuery.isPlaceholderData
                  ? 'opacity-50 transition-opacity'
                  : 'transition-opacity')
              }
            >
              <Table.Header>
                {COLUMNS.map((column) => (
                  <Table.Column
                    key={column.key}
                    isRowHeader={column.key === 'name'}
                    className={`text-micro tracking-[0.12em] uppercase ${column.className}`}
                  >
                    {t(`restaurants.columns.${column.key}`)}
                  </Table.Column>
                ))}
                <Table.Column className="w-12">
                  <span className="sr-only">{t('restaurants.columns.open')}</span>
                </Table.Column>
              </Table.Header>
              <Table.Body items={rows}>
                {(restaurant: Restaurant) => (
                  <Table.Row id={restaurant.objectId} className="group">
                    <Table.Cell>
                      <NameCell restaurant={restaurant} backHref={buildHref(page)} />
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">
                      <PhoneCell phone={restaurant.phone} />
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">
                      <RatingCell rating={restaurant.rating} reviews={restaurant.reviews} />
                    </Table.Cell>
                    <Table.Cell className="text-end whitespace-nowrap">
                      <span className="tabular font-bold">
                        {format.number(restaurant.ordersTotal)}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">
                      <StatusChip enabled={restaurant.enabled} active={restaurant.active} />
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">
                      <span className="text-body tabular block">
                        {format.date(restaurant.createdAt)}
                      </span>
                      <span className="text-caption text-muted tabular block">
                        {format.time(restaurant.createdAt)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <Link
                        href={restaurantDetailHref(restaurant.objectId, buildHref(page))}
                        aria-label={t('restaurants.openRow', { name: formatOrNone(restaurant.name) })}
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
        hasNext={rows.length === RESTAURANT_PAGE_SIZE}
        isFetching={rowsQuery.isFetching}
        onChange={goToPage}
      />
    </section>
  );
}

function NameCell({ restaurant, backHref }: { restaurant: Restaurant; backHref: string }) {
  const name = formatOrNone(restaurant.name);

  return (
    <div className="flex items-center gap-3">
      <Thumbnail url={restaurant.picture?.url} name={restaurant.name} />
      <span className="flex min-w-0 flex-col">
        <Link
          href={restaurantDetailHref(restaurant.objectId, backHref)}
          className="text-body hover:text-accent-soft-foreground truncate font-bold transition-colors"
        >
          {name}
        </Link>
        <span className="text-caption text-muted truncate">
          {restaurant.address?.trim() || restaurant.description?.trim() || '—'}
        </span>
      </span>
    </div>
  );
}

function Thumbnail({ url, name }: { url: string | undefined; name: string | undefined }) {
  if (!url) {
    // Initials rather than a generic store glyph: a column of identical icons gives
    // the eye nothing to anchor on, whereas the first letters of the name do.
    return (
      <span className="bg-accent-soft text-accent-soft-foreground text-caption grid size-10 shrink-0 place-items-center rounded-xl font-bold">
        {initials(name)}
      </span>
    );
  }

  return (
    // Plain <img>, not next/image: the file host isn't verified against
    // images.remotePatterns, and next/image throws at runtime on a host that isn't
    // explicitly configured there.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      loading="lazy"
      title={name}
      className="ring-border/70 size-10 shrink-0 rounded-xl object-cover ring-1"
    />
  );
}

function PhoneCell({ phone }: { phone: string | undefined }) {
  const { t } = useI18n();
  const numbers = splitPhones(phone);
  if (numbers.length === 0) return <span className="text-muted">—</span>;

  return (
    <span className="flex flex-col">
      <a
        href={`tel:${numbers[0].replace(/\s/g, '')}`}
        className="text-body tabular hover:text-accent-soft-foreground transition-colors"
      >
        {numbers[0]}
      </a>
      {numbers[1] && (
        <a
          href={`tel:${numbers[1].replace(/\s/g, '')}`}
          className="text-caption text-muted tabular hover:text-foreground transition-colors"
        >
          {numbers[1]}
        </a>
      )}
      {numbers.length > 2 && (
        <span className="text-caption text-muted">{t('restaurants.morePhones', { count: numbers.length - 2 })}</span>
      )}
    </span>
  );
}

function RatingCell({ rating, reviews }: { rating: number | undefined; reviews: number | undefined }) {
  const { t, format } = useI18n();
  // A 0.0 average with no reviews isn't a bad restaurant, it's an unrated one —
  // showing "0.0 (0)" next to genuine 4.3s actively misleads.
  if (rating === undefined || !reviews) {
    return <span className="text-muted text-caption">{t('restaurants.unrated')}</span>;
  }

  return (
    <span className="flex items-center gap-1.5">
      <StarIcon className="size-3.5 text-[var(--warning)]" />
      <span className="text-body tabular font-bold">{format.decimal(rating)}</span>
      <span className="text-caption text-muted tabular">({format.number(reviews)})</span>
    </span>
  );
}

function EmptyRows() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
      <span className="bg-surface-secondary text-muted mb-2 grid size-12 place-items-center rounded-2xl">
        <FilterIcon className="size-6" />
      </span>
      <p className="text-h6 font-bold">{t('restaurants.emptyTitle')}</p>
      <p className="text-muted text-body">{t('restaurants.emptyBody')}</p>
    </div>
  );
}

function TableSkeleton({ filterBar }: { filterBar: ReactNode }) {
  const { t } = useI18n();

  return (
    <section className="border-border/70 bg-surface rounded-card shadow-card overflow-hidden border">
      {/* The filter bar stays live while rows load — it's what the user is about to
          touch again, and blanking it into a grey pill would make every filter change
          feel like a full page reload. */}
      <div className="border-separator/70 border-b px-5 py-4">{filterBar}</div>
      <div className="border-separator/70 bg-surface-secondary/60 flex gap-4 border-b px-5 py-3">
        {COLUMNS.map((column) => (
          <span
            key={column.key}
            className={`text-micro text-muted tracking-[0.12em] uppercase ${column.className}`}
          >
            {t(`restaurants.columns.${column.key}`)}
          </span>
        ))}
      </div>
      <div className="flex flex-col">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-separator/50 flex items-center gap-4 border-b px-5 py-3.5">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <Skeleton className="h-4 flex-1 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-pill" />
          </div>
        ))}
      </div>
    </section>
  );
}
