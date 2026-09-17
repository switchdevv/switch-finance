'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, useOverlayState } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { orderCatalogueQuery, useOrderCategories } from '@/hooks/use-order-categories';
import { useOrdersInRange } from '@/hooks/use-orders';
import { categoryLabel, sliceOrders } from '@/lib/finance/categories';
import { parsePreset, resolveRange, type RangePreset } from '@/lib/finance/date-range';
import { computeTotals } from '@/lib/finance/totals';
import { exportOrdersWorkbook } from '@/lib/export/excel';
import { PRODUCTS_FIELD, type ExportFieldKey } from '@/lib/export/fields';
import { useI18n } from '@/lib/i18n/provider';
import { parseErrorKey } from '@/lib/parse/errors';
import type { OrderScope } from '@/lib/services/orders';
import { restaurantInvoiceHref } from '@/lib/url/routes';
import type { RestaurantWithRelations } from '@/types/restaurant';
import { DateRangeToolbar } from '@/components/ui/date-range-toolbar';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatTile } from '@/components/ui/stat-tile';
import { ExportModal } from '@/components/restaurants/export-modal';
import { OrdersTable } from '@/components/restaurants/orders-table';
import { ChartIcon, PrinterIcon, ReceiptIcon, SheetIcon, StoreIcon, TagIcon } from '@/components/icons';

const SCOPES: readonly OrderScope[] = ['billable', 'all'];

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
  const { t, tCount, format } = useI18n();
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

  // keepPreviousData leaves the last period's orders in place while a new one loads, and
  // the query reports success for them — so a date change has to count as pending too,
  // or the tiles (and the export and invoice) would show the old period's figures under
  // the new period's label.
  const isPending = rangeQuery.status === 'pending' || rangeQuery.isPlaceholderData;

  const invoiceHref = restaurantInvoiceHref(restaurant.objectId, range);

  // The dishes behind the orders and the menu sections they sit in — paid for only once
  // the export dialog is opened, since nothing else on this page needs them. Orders carry
  // dish ids, never names or sections; see lib/services/foods.
  const { query: catalogueQuery, categories } = useOrderCategories(
    restaurant.objectId,
    rangeQuery.data?.orders,
    { enabled: exportDialog.isOpen },
  );

  const catalogue = catalogueQuery.data;
  const countOrders = useCallback(
    (categoryIds: readonly string[]) => {
      if (categoryIds.length === 0) return totals.ordersCount;
      if (!catalogue || !rangeQuery.data) return 0;
      return computeTotals(
        sliceOrders(rangeQuery.data.orders, catalogue.dishes, categoryIds),
        restaurant.fee,
      ).ordersCount;
    },
    [catalogue, rangeQuery.data, restaurant.fee, totals.ordersCount],
  );

  const onExport = async (fields: ExportFieldKey[], categoryIds: string[]) => {
    if (!rangeQuery.data) return;
    const { orders, truncated } = rangeQuery.data;
    setIsExporting(true);
    try {
      // Only needed for a category split or the Products column — a plain whole-restaurant
      // sheet doesn't wait on it or fail with it. When needed, it comes through the cache
      // the dialog is already subscribed to, so it's normally free.
      const needsCatalogue = categoryIds.length > 0 || fields.includes(PRODUCTS_FIELD);
      const { dishes, menuNames } = needsCatalogue
        ? await queryClient.fetchQuery(orderCatalogueQuery(restaurant.objectId, orders))
        : { dishes: new Map(), menuNames: new Map() };
      // The tiles above stay whole-restaurant; only the file is narrowed.
      const slice = sliceOrders(orders, dishes, categoryIds);

      // Written in the language the dashboard is set to right now, like everything else
      // on screen — the file is a copy of this report, not a separate artefact.
      await exportOrdersWorkbook({
        t,
        tCount,
        format,
        restaurantName: restaurant.name ?? t('restaurants.columns.name'),
        range,
        orders: slice,
        totals: slice === orders ? totals : computeTotals(slice, restaurant.fee),
        currency,
        truncated,
        fields,
        dishes,
        categoryLabel:
          categoryIds.length > 0 ? categoryLabel(categoryIds, menuNames, t) : undefined,
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
            {isExporting ? t('common.preparing') : t('report.excel')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => window.open(invoiceHref, '_blank', 'noopener')}
            isDisabled={isPending || totals.ordersCount === 0}
          >
            <PrinterIcon className="size-4" />
            {t('report.invoice')}
          </Button>
        </div>
      </section>

      {rangeQuery.status === 'error' && (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>{t('report.totalError')}</Alert.Title>
            <Alert.Description>{t(parseErrorKey(rangeQuery.error, 'fetch'))}</Alert.Description>
          </Alert.Content>
          <Button variant="secondary" size="sm" onPress={() => rangeQuery.refetch()}>
            {t('common.retry')}
          </Button>
        </Alert>
      )}

      {!rangeQuery.isPlaceholderData && rangeQuery.data?.truncated && (
        <Alert status="warning">
          <Alert.Content>
            <Alert.Title>{t('report.truncatedTitle')}</Alert.Title>
            <Alert.Description>
              {t('report.truncatedBody', { count: format.number(rangeQuery.data.orders.length) })}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={ReceiptIcon}
          label={t('report.tiles.orders')}
          value={format.number(totals.ordersCount)}
          hint={format.range(range)}
          isPending={isPending}
        />
        <StatTile
          icon={StoreIcon}
          label={t('report.tiles.gross')}
          value={format.money(totals.base, currency)}
          hint={
            totals.discount > 0
              ? t('report.tiles.grossAfterDiscount', {
                  amount: format.money(totals.discount, currency),
                })
              : t('report.tiles.grossHint')
          }
          isPending={isPending}
        />
        <StatTile
          icon={ChartIcon}
          label={t('report.tiles.commission')}
          value={format.money(totals.commission, currency)}
          hint={t('report.tiles.commissionHint', { rate: format.rate(totals.rate) })}
          isPending={isPending}
        />
        <StatTile
          icon={TagIcon}
          label={t('report.tiles.average')}
          value={format.money(Math.round(totals.averageOrder), currency)}
          hint={t('report.tiles.averageHint')}
          isPending={isPending}
        />
      </div>

      <section className="border-border/70 bg-surface rounded-card shadow-card overflow-hidden border">
        <header className="border-separator/70 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <h2 className="text-h6 font-bold">{t('report.ordersTitle')}</h2>
          <SegmentedControl
            label={t('report.scopeLabel')}
            options={SCOPES.map((key) => ({ key, label: t(`report.scopes.${key}`) }))}
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
        isExporting={isExporting}
        categories={categories}
        categoriesStatus={catalogueQuery.status}
        onRetryCategories={() => catalogueQuery.refetch()}
        countOrders={countOrders}
        onExport={onExport}
      />
    </div>
  );
}
