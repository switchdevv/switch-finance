'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, useOverlayState } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrdersInRange } from '@/hooks/use-orders';
import { parsePreset, resolveRange, type RangePreset } from '@/lib/finance/date-range';
import { computeTotals } from '@/lib/finance/totals';
import { exportOrdersWorkbook } from '@/lib/export/excel';
import { collectProductIds, PRODUCTS_FIELD, type ExportFieldKey } from '@/lib/export/fields';
import { formatMoney, formatNumber, formatRate } from '@/lib/format';
import { parseErrorMessage } from '@/lib/parse/errors';
import { queryKeys } from '@/lib/query/keys';
import { fetchProductNames } from '@/lib/services/foods';
import type { OrderScope } from '@/lib/services/orders';
import type { RestaurantWithRelations } from '@/types/restaurant';
import { DateRangeToolbar } from '@/components/ui/date-range-toolbar';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatTile } from '@/components/ui/stat-tile';
import { ExportModal } from '@/components/restaurants/export-modal';
import { OrdersTable } from '@/components/restaurants/orders-table';
import { ChartIcon, PrinterIcon, ReceiptIcon, SheetIcon, StoreIcon, TagIcon } from '@/components/icons';

const SCOPES = [
  { key: 'billable' as const, label: 'Billable' },
  { key: 'all' as const, label: 'All orders' },
];

function parsePage(raw: string | null): number {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/**
 * A restaurant's finances for a period: the four headline figures, the orders behind
 * them, and the two ways of taking them out of the browser.
 *
 * All of the state (preset, custom dates, scope, page) lives in the URL so a report can
 * be linked to a colleague, survives a reload, and can be handed to the invoice route
 * unchanged.
 */
export function OrdersPanel({ restaurant }: { restaurant: RestaurantWithRelations }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const exportDialog = useOverlayState();
  const [isExporting, setIsExporting] = useState(false);

  const preset = parsePreset(searchParams.get('range'));
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const scope: OrderScope = searchParams.get('scope') === 'all' ? 'all' : 'billable';
  const page = parsePage(searchParams.get('opage'));

  const range = useMemo(() => resolveRange(preset, from, to), [preset, from, to]);
  const currency = restaurant.city?.currency;

  const setParams = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === undefined) params.delete(key);
        else params.set(key, value);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Any change to what's being reported on sends the table back to page 1 — page 4 of a
  // different period is a different set of orders, not the same place.
  const onPresetChange = (next: RangePreset) =>
    setParams({
      range: next,
      opage: undefined,
      // Seed the custom inputs from whatever period was on screen, so switching to
      // Custom starts from where the user already was instead of snapping to today.
      ...(next === 'custom' ? { from: range.from, to: range.to } : { from: undefined, to: undefined }),
    });

  const onCustomChange = (nextFrom: string, nextTo: string) =>
    setParams({ range: 'custom', from: nextFrom, to: nextTo, opage: undefined });

  const onScopeChange = (next: OrderScope) =>
    setParams({ scope: next === 'billable' ? undefined : next, opage: undefined });

  const onPageChange = useCallback(
    (next: number) => setParams({ opage: next > 1 ? String(next) : undefined }),
    [setParams],
  );

  // Always billable, whatever the table is showing: a total that counted canceled orders
  // would be wrong, and this same data is what the spreadsheet and the invoice are built
  // from.
  const rangeQuery = useOrdersInRange(restaurant.objectId, range);
  const totals = useMemo(
    () => computeTotals(rangeQuery.data?.orders ?? [], restaurant.fee),
    [rangeQuery.data, restaurant.fee],
  );

  const isPending = rangeQuery.status === 'pending';

  const invoiceHref = `/restaurants/${restaurant.objectId}/invoice?from=${range.from}&to=${range.to}`;

  const onExport = async (fields: ExportFieldKey[]) => {
    if (!rangeQuery.data) return;
    const { orders, truncated } = rangeQuery.data;
    setIsExporting(true);
    try {
      // Only paid for when the Products column is actually going into the file, and
      // through the cache so a second export of the same period is free. Orders carry
      // dish ids, never dish names — see lib/services/foods.
      const productNames = fields.includes(PRODUCTS_FIELD)
        ? await queryClient.fetchQuery({
            queryKey: queryKeys.foods.names(restaurant.objectId, {
              from: range.from,
              to: range.to,
            }),
            queryFn: () => fetchProductNames(collectProductIds(orders)),
            staleTime: 60_000,
          })
        : new Map<string, string>();

      await exportOrdersWorkbook({
        restaurantName: restaurant.name ?? 'Restaurant',
        range,
        orders,
        totals,
        currency,
        truncated,
        fields,
        productNames,
      });
      exportDialog.close();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="border-border/70 bg-surface rounded-card shadow-card flex flex-wrap items-center justify-between gap-4 border px-5 py-4">
        <DateRangeToolbar
          range={range}
          onPresetChange={onPresetChange}
          onCustomChange={onCustomChange}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onPress={exportDialog.open}
            isDisabled={isPending || isExporting || totals.ordersCount === 0}
          >
            <SheetIcon className="size-4" />
            {isExporting ? 'Preparing…' : 'Excel'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => window.open(invoiceHref, '_blank', 'noopener')}
            isDisabled={isPending || totals.ordersCount === 0}
          >
            <PrinterIcon className="size-4" />
            Invoice
          </Button>
        </div>
      </section>

      {rangeQuery.status === 'error' && (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>Couldn&apos;t total this period</Alert.Title>
            <Alert.Description>{parseErrorMessage(rangeQuery.error, 'fetch')}</Alert.Description>
          </Alert.Content>
          <Button variant="secondary" size="sm" onPress={() => rangeQuery.refetch()}>
            Retry
          </Button>
        </Alert>
      )}

      {rangeQuery.data?.truncated && (
        <Alert status="warning">
          <Alert.Content>
            <Alert.Title>This period is too large to total exactly</Alert.Title>
            <Alert.Description>
              Only the first {formatNumber(rangeQuery.data.orders.length)} orders were read, so the
              figures below are a floor rather than a total. Narrow the dates to get an exact
              number.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={ReceiptIcon}
          label="Billable orders"
          value={formatNumber(totals.ordersCount)}
          hint={range.label}
          isPending={isPending}
        />
        <StatTile
          icon={StoreIcon}
          label="Gross sales"
          value={formatMoney(totals.base, currency)}
          hint={
            totals.discount > 0
              ? `after ${formatMoney(totals.discount, currency)} of discounts`
              : 'items total, net of discounts'
          }
          isPending={isPending}
        />
        <StatTile
          icon={ChartIcon}
          label="Commission"
          value={formatMoney(totals.commission, currency)}
          hint={`${formatRate(totals.rate)} of gross sales, owed to Switch`}
          isPending={isPending}
        />
        <StatTile
          icon={TagIcon}
          label="Average order"
          value={formatMoney(Math.round(totals.averageOrder), currency)}
          hint="gross sales per billable order"
          isPending={isPending}
        />
      </div>

      <section className="border-border/70 bg-surface rounded-card shadow-card overflow-hidden border">
        <header className="border-separator/70 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <h2 className="text-h6 font-bold">Orders</h2>
          <SegmentedControl
            label="Which orders"
            options={SCOPES}
            value={scope}
            onChange={onScopeChange}
          />
        </header>

        <OrdersTable
          restaurantId={restaurant.objectId}
          range={range}
          scope={scope}
          currency={currency}
          page={page}
          onPageChange={onPageChange}
        />
      </section>

      <ExportModal
        isOpen={exportDialog.isOpen}
        onOpenChange={exportDialog.setOpen}
        range={range}
        orderCount={totals.ordersCount}
        isExporting={isExporting}
        onExport={onExport}
      />
    </div>
  );
}
