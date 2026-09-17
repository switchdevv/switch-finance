'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, ListBox, Select } from '@heroui/react';
import { useOrderCategories } from '@/hooks/use-order-categories';
import { useRestaurant } from '@/hooks/use-restaurants';
import { useOrdersInRange } from '@/hooks/use-orders';
import {
  categoryCode,
  categoryLabel,
  sliceOrders,
  type OrderCategory,
} from '@/lib/finance/categories';
import { resolveRange, type DateRange } from '@/lib/finance/date-range';
import { computeTotals, type OrderTotals } from '@/lib/finance/totals';
import { formatOrNone, shortId } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';
import { parseErrorKey } from '@/lib/parse/errors';
import type { CurrencyCode } from '@/types/city';
import type { OrderWithUser } from '@/types/order';
import type { RestaurantWithRelations } from '@/types/restaurant';
import { CATEGORIES_PARAM, readCategoryIds, readRestaurantId } from '@/lib/url/routes';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { BrandMark } from '@/components/brand-mark';
import { LanguageToggle } from '@/components/language-toggle';
import { PrinterIcon } from '@/components/icons';

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

  // In the URL, unlike the mode: which part of the restaurant is billed changes what the
  // document *is*, so a link to it has to carry that.
  const categoryIds = useMemo(() => readCategoryIds(searchParams), [searchParams]);
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
  // since the whole app is one document in a static export.
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

  const setCategoryIds = (next: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) params.set(CATEGORIES_PARAM, next.join(','));
    else params.delete(CATEGORIES_PARAM);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            label={t('invoice.modeLabel')}
            options={MODES.map((key) => ({ key, label: t(`invoice.modes.${key}`) }))}
            value={mode}
            onChange={setMode}
          />
          <CategoryPicker
            categories={categories}
            value={categoryIds}
            isDisabled={catalogueQuery.status !== 'success' || categories.length === 0}
            onChange={setCategoryIds}
          />
        </div>
        <div className="flex items-center gap-3">
          {/* This route has none of the app chrome, and the document's language is the
              one it prints in — so the switcher has to be here, next to Print. */}
          <LanguageToggle />
          <Button variant="primary" size="sm" onPress={() => window.print()}>
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
      />
    </div>
  );
}

/**
 * Narrows the document to some of the restaurant's menu sections — e.g. a crêpe station
 * billed apart from the rest. Offers only the sections that sold in the period; nothing
 * picked is the whole restaurant.
 */
function CategoryPicker({
  categories,
  value,
  isDisabled,
  onChange,
}: {
  categories: OrderCategory[];
  value: string[];
  isDisabled: boolean;
  onChange: (next: string[]) => void;
}) {
  const { t, format } = useI18n();

  return (
    <Select
      aria-label={t('invoice.categoriesLabel')}
      selectionMode="multiple"
      placeholder={t('invoice.wholeRestaurant')}
      value={value}
      onChange={(keys) => onChange(keys.map(String))}
      isDisabled={isDisabled}
      className="w-64"
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {categories.map((category) => (
            <ListBox.Item key={category.id} id={category.id} textValue={category.name}>
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="truncate">{category.name}</span>
                <span className="text-caption text-muted tabular">
                  {format.number(category.orderCount)}
                </span>
              </span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
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
}: {
  restaurant: RestaurantWithRelations;
  range: DateRange;
  /** Already narrowed to `scope`'s categories, as are `totals`. */
  orders: OrderWithUser[];
  totals: OrderTotals;
  currency: CurrencyCode | undefined;
  mode: Mode;
  scope?: CategoryScope;
}) {
  return (
    <article className="invoice-sheet shadow-card mx-auto max-w-[210mm] bg-white px-[14mm] py-[14mm] text-[#111827] print:max-w-none print:shadow-none">
      <Header restaurant={restaurant} range={range} mode={mode} scope={scope} />
      <BilledTo restaurant={restaurant} mode={mode} scope={scope} />
      <Summary totals={totals} mode={mode} currency={currency} />
      <Lines orders={orders} currency={currency} />
      <Footnote rate={totals.rate} scope={scope} />
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
}: {
  totals: OrderTotals;
  mode: Mode;
  currency: CurrencyCode | undefined;
}) {
  const { t, format } = useI18n();

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
          { label: t('invoice.summary.rate'), value: format.rate(totals.rate) },
        ]
      : [
          ...shared,
          {
            label: t('invoice.summary.average'),
            value: format.money(Math.round(totals.averageOrder), currency),
          },
        ];

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
            <td className="py-3 font-bold">
              {mode === 'commission'
                ? t('invoice.summary.commissionDue')
                : t('invoice.summary.grossSales')}
            </td>
            <td className="tabular py-3 text-end text-[16px] font-bold">
              {format.money(mode === 'commission' ? totals.commission : totals.base, currency)}
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

      {/* Delivery and service fees are shown but kept visibly outside the sum: customers
          pay them on top of the food, they belong to the driver and the platform, and no
          commission is charged on either. */}
      <p className="text-caption mt-3 text-[#6b7280]">
        {t('invoice.fees', {
          delivery: format.money(totals.delivery, currency),
          service: format.money(totals.service, currency),
        })}
      </p>
    </section>
  );
}

function Lines({
  orders,
  currency,
}: {
  orders: OrderWithUser[];
  currency: CurrencyCode | undefined;
}) {
  const { t, format } = useI18n();

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
            <th className="px-2 py-2 text-start font-bold">{t('invoice.lines.order')}</th>
            <th className="px-2 py-2 text-start font-bold">{t('invoice.lines.date')}</th>
            <th className="px-2 py-2 text-start font-bold">{t('invoice.lines.type')}</th>
            <th className="px-2 py-2 text-end font-bold">{t('invoice.lines.items')}</th>
            <th className="px-2 py-2 text-end font-bold">{t('invoice.lines.discount')}</th>
            <th className="px-2 py-2 text-end font-bold">{t('invoice.lines.net')}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const items = order.options?.itemsTotal ?? 0;
            const discount = order.options?.discount ?? 0;
            return (
              <tr key={order.objectId} className="border-b border-[#f3f4f6]">
                <td className="tabular px-2 py-1.5">#{shortId(order.objectId)}</td>
                <td className="tabular px-2 py-1.5">{format.date(order.createdAt)}</td>
                <td className="px-2 py-1.5">
                  {order.deliveryType === 'pickup' ? t('common.pickup') : t('common.delivery')}
                </td>
                <td className="tabular px-2 py-1.5 text-end">{format.money(items, currency)}</td>
                <td className="tabular px-2 py-1.5 text-end">
                  {discount ? `−${format.money(discount, currency)}` : '—'}
                </td>
                <td className="tabular px-2 py-1.5 text-end font-bold">
                  {format.money(items - discount, currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function Footnote({ rate, scope }: { rate: number; scope?: CategoryScope }) {
  const { t, format } = useI18n();

  return (
    <footer className="border-t border-[#e5e7eb] pt-4 text-[11px] leading-relaxed text-[#6b7280]">
      <p>{t('invoice.footnote.billable')}</p>
      <p className="mt-1">{t('invoice.footnote.settlement', { rate: format.rate(rate) })}</p>
      {scope && (
        <p className="mt-1">{t('invoice.footnote.scope', { categories: scope.label })}</p>
      )}
    </footer>
  );
}
