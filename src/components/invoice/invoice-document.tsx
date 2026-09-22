'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, useOverlayState } from '@heroui/react';
import { useOrderCategories } from '@/hooks/use-order-categories';
import { useRestaurant } from '@/hooks/use-restaurants';
import { useOrdersInRange } from '@/hooks/use-orders';
import {
  categoryCode,
  categoryLabel,
  sliceOrders,
} from '@/lib/finance/categories';
import { hasCarryOver, totalDue, type CarryOver } from '@/lib/finance/carry-over';
import { resolveRange, type DateRange } from '@/lib/finance/date-range';
import { computeTotals, type OrderTotals } from '@/lib/finance/totals';
import { INVOICE_COLUMNS, type InvoiceColumnKey } from '@/lib/invoice/columns';
import {
  readInvoiceOptions,
  writeInvoiceOptions,
  type InvoiceOptions,
} from '@/lib/invoice/options';
import { formatOrNone, shortId } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';
import { parseErrorKey } from '@/lib/parse/errors';
import type { CurrencyCode } from '@/types/city';
import type { OrderWithUser } from '@/types/order';
import type { RestaurantWithRelations } from '@/types/restaurant';
import { readRestaurantId } from '@/lib/url/routes';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { BrandMark } from '@/components/brand-mark';
import { LanguageToggle } from '@/components/language-toggle';
import { PrinterIcon } from '@/components/icons';
import { InvoiceOptionsModal } from '@/components/invoice/invoice-options-modal';

/**
 * `commission` bills the restaurant for Switch's cut; `statement` is a record of what it
 * traded over the period, with the commission shown for information rather than as a
 * demand. Same figures, different purpose — which is why it's a toggle on the document
 * rather than two separate exports.
 *
 * Neither one shows a payout: orders are paid to the restaurant when they're taken, so
 * money only ever flows the other way.
 */
type Mode = 'commission' | 'statement';

const MODES: readonly Mode[] = ['commission', 'statement'];

/** The part of the restaurant a document covers, when it isn't all of it. */
type CategoryScope = { label: string; code: string; count: number };

export function InvoiceDocument() {
  const { t, format } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const objectId = readRestaurantId(searchParams);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const [mode, setMode] = useState<Mode>(
    searchParams.get('mode') === 'statement' ? 'statement' : 'commission',
  );
  const optionsDialog = useOverlayState();

  /**
   * What the document is drawn with. Seeded from the link — which is both how the
   * Invoice button on the restaurant page configures this tab and how a colleague
   * reproduces an exact document — and thereafter owned here, committed by the print
   * dialog. Holding it in state rather than re-reading the URL every render is what lets
   * the printer be called immediately after the choices are applied, instead of racing a
   * router transition.
   */
  const [options, setOptions] = useState<InvoiceOptions>(() => readInvoiceOptions(searchParams));
  const { categoryIds, carryOver } = options;
  const isNarrowed = categoryIds.length > 0;

  const range = useMemo(() => resolveRange('custom', from, to), [from, to]);

  const restaurantQuery = useRestaurant(objectId);
  const ordersQuery = useOrdersInRange(objectId, range);
  // Always loaded, not only for a narrowed link: the picker needs it to offer anything.
  const { query: catalogueQuery, categories } = useOrderCategories(
    objectId,
    ordersQuery.data?.orders,
    { enabled: true },
  );

  const restaurant = restaurantQuery.data;
  const catalogue = catalogueQuery.data;
  const orders = useMemo(() => {
    const all = ordersQuery.data?.orders ?? [];
    if (!isNarrowed) return all;
    return catalogue ? sliceOrders(all, catalogue.dishes, categoryIds) : [];
  }, [ordersQuery.data, isNarrowed, catalogue, categoryIds]);
  const totals = useMemo(() => computeTotals(orders, restaurant?.fee), [orders, restaurant?.fee]);

  const unsoldCategoryCount = categoryIds.filter(
    (id) => !categories.some((category) => category.id === id),
  ).length;

  const scope = useMemo<CategoryScope | undefined>(
    () =>
      isNarrowed && catalogue
        ? {
            label: categoryLabel(categoryIds, catalogue.menuNames, t),
            code: categoryCode(categoryIds),
            count: categoryIds.length,
          }
        : undefined,
    [isNarrowed, catalogue, categoryIds, t],
  );

  // The tab's title is what the browser offers as the filename when this is saved as a
  // PDF, so it is translated like the document it names — and restored on the way out,
  // since the whole app is one document in a static export. It no longer reaches paper:
  // the print stylesheet drops the browser's own header and footer.
  const documentTitle =
    restaurantQuery.data && `${t(`invoice.modes.${mode}`)} — ${formatOrNone(restaurantQuery.data.name)} — ${format.range(range)}`;
  useEffect(() => {
    if (!documentTitle) return;
    const previous = document.title;
    document.title = documentTitle;
    return () => {
      document.title = previous;
    };
  }, [documentTitle]);

  /**
   * Bumped by the dialog once its choices are committed. The print itself waits a frame:
   * `setOptions` above has re-rendered the document by then, so what the printer is
   * handed is the document the dialog just described rather than the one before it.
   */
  const [printRequest, setPrintRequest] = useState(0);
  useEffect(() => {
    if (printRequest === 0) return;
    const frame = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(frame);
  }, [printRequest]);

  const applyAndPrint = (next: InvoiceOptions) => {
    setOptions(next);
    // The address bar follows the document so the link can be copied to a colleague,
    // but nothing on screen is driven by it.
    const params = new URLSearchParams(searchParams.toString());
    writeInvoiceOptions(params, next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    optionsDialog.close();
    setPrintRequest((count) => count + 1);
  };

  if (!objectId) {
    return <p className="text-muted p-10 text-center">{t('invoice.incomplete')}</p>;
  }

  // The lookup only blocks the document when the document depends on it — a
  // whole-restaurant invoice still prints if the menu sections can't be read.
  const catalogueBlocks = isNarrowed && catalogueQuery.status === 'error';

  if (restaurantQuery.status === 'error' || ordersQuery.status === 'error' || catalogueBlocks) {
    const error = restaurantQuery.error ?? ordersQuery.error ?? catalogueQuery.error;
    return (
      <div className="mx-auto max-w-2xl p-10">
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>{t('invoice.buildError')}</Alert.Title>
            <Alert.Description>{t(parseErrorKey(error, 'fetch'))}</Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  if (
    restaurantQuery.status === 'pending' ||
    ordersQuery.status === 'pending' ||
    (isNarrowed && catalogueQuery.status === 'pending')
  ) {
    return <p className="text-muted p-10 text-center">{t('invoice.preparing')}</p>;
  }

  if (!restaurant) {
    return <p className="text-muted p-10 text-center">{t('invoice.gone')}</p>;
  }

  const currency = restaurant.city?.currency;

  return (
    <div className="bg-surface-secondary min-h-dvh py-8 print:bg-white print:py-0">
      {/* The controls are the screen's, not the document's — `print:hidden` is what keeps
          them off the paper without a second copy of the layout. */}
      <div className="mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <SegmentedControl
          label={t('invoice.modeLabel')}
          options={MODES.map((key) => ({ key, label: t(`invoice.modes.${key}`) }))}
          value={mode}
          onChange={setMode}
        />
        <div className="flex items-center gap-3">
          {/* This route has none of the app chrome, and the document's language is the
              one it prints in — so the switcher has to be here, next to Print. */}
          <LanguageToggle />
          <Button variant="primary" size="sm" onPress={optionsDialog.open}>
            <PrinterIcon className="size-4" />
            {t('invoice.print')}
          </Button>
        </div>
      </div>

      {unsoldCategoryCount > 0 && (
        <div className="mx-auto mb-6 max-w-[210mm] px-4 print:hidden">
          <Alert status="warning">
            <Alert.Content>
              <Alert.Title>{t('invoice.unsoldTitle')}</Alert.Title>
              <Alert.Description>{t('invoice.unsoldBody')}</Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      )}

      {ordersQuery.data?.truncated && (
        <div className="mx-auto mb-6 max-w-[210mm] px-4 print:hidden">
          <Alert status="warning">
            <Alert.Content>
              <Alert.Title>{t('invoice.truncatedTitle')}</Alert.Title>
              <Alert.Description>
                {t('invoice.truncatedBody', {
                  count: format.number(ordersQuery.data.orders.length),
                })}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      )}

      <InvoiceSheet
        restaurant={restaurant}
        range={range}
        orders={orders}
        totals={totals}
        currency={currency}
        mode={mode}
        scope={scope}
        columns={options.columns}
        carryOver={carryOver}
      />

      <InvoiceOptionsModal
        isOpen={optionsDialog.isOpen}
        onOpenChange={optionsDialog.setOpen}
        intent="print"
        value={options}
        categories={categories}
        categoriesStatus={catalogueQuery.status}
        onRetryCategories={() => catalogueQuery.refetch()}
        currency={currency}
        onConfirm={applyAndPrint}
      />
    </div>
  );
}

/**
 * The document itself — everything that reaches paper, and nothing that fetches. Split
 * from the page above so the print layout can be rendered from fixed data (a preview, a
 * test) without a Parse session, and so the fetching and the typography stay separately
 * reviewable.
 */
export function InvoiceSheet({
  restaurant,
  range,
  orders,
  totals,
  currency,
  mode,
  scope,
  columns,
  carryOver,
}: {
  restaurant: RestaurantWithRelations;
  range: DateRange;
  /** Already narrowed to `scope`'s categories, as are `totals`. */
  orders: OrderWithUser[];
  totals: OrderTotals;
  currency: CurrencyCode | undefined;
  mode: Mode;
  scope?: CategoryScope;
  /** Which line-item columns to print; none prints no table at all. */
  columns: readonly InvoiceColumnKey[];
  /** Owed from before this period, if any — added after the commission, never rated. */
  carryOver?: CarryOver;
}) {
  return (
    <article className="invoice-sheet shadow-card mx-auto max-w-[210mm] bg-white px-[14mm] py-[14mm] text-[#111827] print:max-w-none print:shadow-none">
      <Header restaurant={restaurant} range={range} mode={mode} scope={scope} />
      <BilledTo restaurant={restaurant} mode={mode} scope={scope} />
      <Summary totals={totals} mode={mode} currency={currency} carryOver={carryOver} />
      <Lines orders={orders} currency={currency} columns={columns} />
      <Footnote scope={scope} />
    </article>
  );
}

function Header({
  restaurant,
  range,
  mode,
  scope,
}: {
  restaurant: RestaurantWithRelations;
  range: DateRange;
  mode: Mode;
  scope?: CategoryScope;
}) {
  const { t, format } = useI18n();

  return (
    <header className="mb-8 flex items-start justify-between gap-6 border-b border-[#e5e7eb] pb-6">
      <div className="flex items-center gap-3">
        <BrandMark className="size-10" />
        <div>
          <p className="text-h6 font-bold">{t('app.name')}</p>
          <p className="text-caption text-[#6b7280]">{t('invoice.tagline')}</p>
        </div>
      </div>
      <div className="text-end">
        <p className="text-h5 font-bold">{t(`invoice.modes.${mode}`)}</p>
        {/* Deterministic rather than a sequence number: this document can be regenerated
            from a URL at any time, and two runs of the same period must not disagree
            about what they are. A category invoice adds a code for its selection, so it
            never shares a number with the whole restaurant's for the same period. */}
        <p className="text-caption tabular text-[#6b7280]">
          {t('invoice.number', {
            number: `SW-${shortId(restaurant.objectId)}-${range.from.replace(/-/g, '')}${
              scope ? `-${scope.code}` : ''
            }`,
          })}
        </p>
        <p className="text-caption tabular mt-2">
          <span className="text-[#6b7280]">{t('invoice.period')} </span>
          {format.range(range)}
        </p>
        <p className="text-caption tabular">
          <span className="text-[#6b7280]">{t('invoice.issued')} </span>
          {format.date(new Date())}
        </p>
      </div>
    </header>
  );
}

function BilledTo({
  restaurant,
  mode,
  scope,
}: {
  restaurant: RestaurantWithRelations;
  mode: Mode;
  scope?: CategoryScope;
}) {
  const { t, tCount } = useI18n();

  return (
    <section className="mb-8">
      <p className="text-micro font-bold tracking-[0.12em] text-[#6b7280] uppercase">
        {mode === 'commission' ? t('invoice.billedTo') : t('invoice.statementFor')}
      </p>
      <p className="text-h6 mt-1.5 font-bold">{formatOrNone(restaurant.name)}</p>
      {scope && (
        <p className="text-caption mt-0.5 font-bold">
          <span className="font-normal text-[#6b7280]">
            {tCount('invoice.category', scope.count)}{' '}
          </span>
          {scope.label}
        </p>
      )}
      <p className="text-caption text-[#374151]">
        {formatOrNone(restaurant.address)}
        {restaurant.city?.name ? ` · ${restaurant.city.name}` : ''}
      </p>
      {restaurant.phone && (
        <p className="text-caption tabular text-[#374151]">{restaurant.phone}</p>
      )}
    </section>
  );
}

function Summary({
  totals,
  mode,
  currency,
  carryOver,
}: {
  totals: OrderTotals;
  mode: Mode;
  currency: CurrencyCode | undefined;
  carryOver?: CarryOver;
}) {
  const { t, format } = useI18n();
  const carried = hasCarryOver(carryOver);

  const shared = [
    { label: t('invoice.summary.orders'), value: format.number(totals.ordersCount) },
    { label: t('invoice.summary.items'), value: format.money(totals.itemsTotal, currency) },
    { label: t('invoice.summary.discounts'), value: `−${format.money(totals.discount, currency)}` },
  ];

  const rows: { label: string; value: string }[] =
    mode === 'commission'
      ? [
          ...shared,
          { label: t('invoice.summary.base'), value: format.money(totals.base, currency) },
          // With nothing carried over, the commission *is* the total and stays on the
          // bold line below. With something carried over it becomes one of two
          // components of it, and moves up here.
          ...(carried
            ? [
                {
                  label: t('invoice.summary.commissionPeriod'),
                  value: format.money(totals.commission, currency),
                },
                {
                  label: carryOver?.note
                    ? t('invoice.summary.previousBalanceNoted', { note: carryOver.note })
                    : t('invoice.summary.previousBalance'),
                  value: format.money(carryOver?.amount ?? 0, currency),
                },
              ]
            : []),
        ]
      : [
          ...shared,
          {
            label: t('invoice.summary.average'),
            value: format.money(Math.round(totals.averageOrder), currency),
          },
        ];

  const totalLabel =
    mode === 'statement'
      ? t('invoice.summary.grossSales')
      : carried
        ? t('invoice.summary.totalDue')
        : t('invoice.summary.commissionDue');
  const totalValue =
    mode === 'statement' ? totals.base : totalDue(totals.commission, carryOver);

  return (
    <section className="mb-8">
      <table className="w-full text-[13px]">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-[#f3f4f6]">
              <td className="py-2 text-[#374151]">{row.label}</td>
              <td className="tabular py-2 text-end">{row.value}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-[#111827]">
            <td className="py-3 font-bold">{totalLabel}</td>
            <td className="tabular py-3 text-end text-[16px] font-bold">
              {format.money(totalValue, currency)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* On a statement the commission sits below the total, not inside it: the headline
          figure is what the restaurant traded, and the commission is a separate matter
          that the invoice above exists to bill. */}
      {mode === 'statement' && (
        <p className="text-caption mt-3 text-[#374151]">
          {t('invoice.statementCommission', { rate: format.rate(totals.rate) })}{' '}
          <strong className="tabular">{format.money(totals.commission, currency)}</strong>
        </p>
      )}

      {/* A statement isn't a demand, so a carry-over can't be folded into its total —
          it's stated underneath instead, next to the commission it adds to. */}
      {mode === 'statement' && carried && (
        <p className="text-caption mt-1 text-[#374151]">
          {carryOver?.note
            ? t('invoice.summary.previousBalanceNoted', { note: carryOver.note })
            : t('invoice.summary.previousBalance')}{' '}
          <strong className="tabular">{format.money(carryOver?.amount ?? 0, currency)}</strong>
          {' · '}
          {t('invoice.summary.totalDue')}{' '}
          <strong className="tabular">
            {format.money(totalDue(totals.commission, carryOver), currency)}
          </strong>
        </p>
      )}
    </section>
  );
}

function Lines({
  orders,
  currency,
  columns,
}: {
  orders: OrderWithUser[];
  currency: CurrencyCode | undefined;
  columns: readonly InvoiceColumnKey[];
}) {
  const { t, format } = useI18n();

  // The printed order is INVOICE_COLUMNS' own, never the order they were ticked in.
  const picked = new Set(columns);
  const printed = INVOICE_COLUMNS.filter((column) => picked.has(column.key));
  if (printed.length === 0) return null;

  const context = { t, format, currency };

  return (
    <section className="mb-8">
      <p className="text-micro mb-2 font-bold tracking-[0.12em] text-[#6b7280] uppercase">
        {t('invoice.linesTitle')}
      </p>
      <table className="w-full text-[12px]">
        {/* thead, not a styled first row: the print CSS turns this into a repeating
            header so page 2 onward isn't a wall of unlabelled numbers. */}
        <thead>
          <tr className="bg-[#f3f4f6] text-start">
            {printed.map((column) => (
              <th
                key={column.key}
                className={`px-2 py-2 font-bold ${column.align === 'end' ? 'text-end' : 'text-start'}`}
              >
                {t(column.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.objectId} className="border-b border-[#f3f4f6]">
              {printed.map((column) => (
                <td
                  key={column.key}
                  className={`tabular px-2 py-1.5 ${column.align === 'end' ? 'text-end' : ''} ${
                    column.isStrong ? 'font-bold' : ''
                  }`}
                >
                  {column.cell(order, context)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Footnote({ scope }: { scope?: CategoryScope }) {
  const { t } = useI18n();

  // Only a category invoice has anything left to explain — a whole-restaurant one ends
  // at its total.
  if (!scope) return null;

  return (
    <footer className="border-t border-[#e5e7eb] pt-4 text-[11px] leading-relaxed text-[#6b7280]">
      <p>{t('invoice.footnote.scope', { categories: scope.label })}</p>
    </footer>
  );
}
