'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Button } from '@heroui/react';
import { useRestaurant } from '@/hooks/use-restaurants';
import { useOrdersInRange } from '@/hooks/use-orders';
import { resolveRange } from '@/lib/finance/date-range';
import { computeTotals, type OrderTotals } from '@/lib/finance/totals';
import { formatDate, formatMoney, formatNumber, formatOrNone, formatRate, shortId } from '@/lib/format';
import { parseErrorMessage } from '@/lib/parse/errors';
import type { CurrencyCode } from '@/types/city';
import type { OrderWithUser } from '@/types/order';
import type { RestaurantWithRelations } from '@/types/restaurant';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { BrandMark } from '@/components/brand-mark';
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

const MODES = [
  { key: 'commission' as const, label: 'Commission invoice' },
  { key: 'statement' as const, label: 'Sales statement' },
];

export function InvoiceDocument({ objectId }: { objectId: string }) {
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const [mode, setMode] = useState<Mode>(
    searchParams.get('mode') === 'statement' ? 'statement' : 'commission',
  );

  const range = useMemo(() => resolveRange('custom', from, to), [from, to]);

  const restaurantQuery = useRestaurant(objectId);
  const ordersQuery = useOrdersInRange(objectId, range);

  const restaurant = restaurantQuery.data;
  const orders = useMemo(() => ordersQuery.data?.orders ?? [], [ordersQuery.data]);
  const totals = useMemo(() => computeTotals(orders, restaurant?.fee), [orders, restaurant?.fee]);

  if (restaurantQuery.status === 'error' || ordersQuery.status === 'error') {
    const error = restaurantQuery.error ?? ordersQuery.error;
    return (
      <div className="mx-auto max-w-2xl p-10">
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>Couldn&apos;t build this invoice</Alert.Title>
            <Alert.Description>{parseErrorMessage(error, 'fetch')}</Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  if (restaurantQuery.status === 'pending' || ordersQuery.status === 'pending') {
    return <p className="text-muted p-10 text-center">Preparing the invoice…</p>;
  }

  if (!restaurant) {
    return <p className="text-muted p-10 text-center">That restaurant no longer exists.</p>;
  }

  const currency = restaurant.city?.currency;

  return (
    <div className="bg-surface-secondary min-h-dvh py-8 print:bg-white print:py-0">
      {/* The controls are the screen's, not the document's — `print:hidden` is what keeps
          them off the paper without a second copy of the layout. */}
      <div className="mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <SegmentedControl label="Invoice type" options={MODES} value={mode} onChange={setMode} />
        <Button variant="primary" size="sm" onPress={() => window.print()}>
          <PrinterIcon className="size-4" />
          Print / Save as PDF
        </Button>
      </div>

      {ordersQuery.data?.truncated && (
        <div className="mx-auto mb-6 max-w-[210mm] px-4 print:hidden">
          <Alert status="warning">
            <Alert.Content>
              <Alert.Title>This period is too large to invoice exactly</Alert.Title>
              <Alert.Description>
                Only the first {formatNumber(orders.length)} orders were read. Narrow the dates
                before sending this to anyone.
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
}: {
  restaurant: RestaurantWithRelations;
  range: { from: string; to: string; label: string };
  orders: OrderWithUser[];
  totals: OrderTotals;
  currency: CurrencyCode | undefined;
  mode: Mode;
}) {
  return (
    <article className="invoice-sheet shadow-card mx-auto max-w-[210mm] bg-white px-[14mm] py-[14mm] text-[#111827] print:max-w-none print:shadow-none">
      <Header restaurant={restaurant} range={range} mode={mode} />
      <BilledTo restaurant={restaurant} mode={mode} />
      <Summary totals={totals} mode={mode} currency={currency} />
      <Lines orders={orders} currency={currency} />
      <Footnote rate={totals.rate} />
    </article>
  );
}

function Header({
  restaurant,
  range,
  mode,
}: {
  restaurant: RestaurantWithRelations;
  range: { from: string; to: string; label: string };
  mode: Mode;
}) {
  return (
    <header className="mb-8 flex items-start justify-between gap-6 border-b border-[#e5e7eb] pb-6">
      <div className="flex items-center gap-3">
        <BrandMark className="size-10" />
        <div>
          <p className="text-h6 font-bold">Switch</p>
          <p className="text-caption text-[#6b7280]">Food delivery platform</p>
        </div>
      </div>
      <div className="text-end">
        <p className="text-h5 font-bold">
          {mode === 'commission' ? 'Commission invoice' : 'Sales statement'}
        </p>
        {/* Deterministic rather than a sequence number: this document can be regenerated
            from a URL at any time, and two runs of the same period must not disagree
            about what they are. */}
        <p className="text-caption tabular text-[#6b7280]">
          No. SW-{shortId(restaurant.objectId)}-{range.from.replace(/-/g, '')}
        </p>
        <p className="text-caption tabular mt-2">
          <span className="text-[#6b7280]">Period: </span>
          {range.label}
        </p>
        <p className="text-caption tabular">
          <span className="text-[#6b7280]">Issued: </span>
          {formatDate(new Date().toISOString())}
        </p>
      </div>
    </header>
  );
}

function BilledTo({ restaurant, mode }: { restaurant: RestaurantWithRelations; mode: Mode }) {
  return (
    <section className="mb-8">
      <p className="text-micro font-bold tracking-[0.12em] text-[#6b7280] uppercase">
        {mode === 'commission' ? 'Billed to' : 'Statement for'}
      </p>
      <p className="text-h6 mt-1.5 font-bold">{formatOrNone(restaurant.name)}</p>
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
  const rows: { label: string; value: string; muted?: boolean }[] =
    mode === 'commission'
      ? [
          { label: 'Billable orders', value: formatNumber(totals.ordersCount) },
          { label: 'Items total', value: formatMoney(totals.itemsTotal, currency) },
          { label: 'Discounts', value: `−${formatMoney(totals.discount, currency)}` },
          { label: 'Commission base', value: formatMoney(totals.base, currency) },
          { label: `Commission rate`, value: formatRate(totals.rate) },
        ]
      : [
          { label: 'Billable orders', value: formatNumber(totals.ordersCount) },
          { label: 'Items total', value: formatMoney(totals.itemsTotal, currency) },
          { label: 'Discounts', value: `−${formatMoney(totals.discount, currency)}` },
          {
            label: 'Average order',
            value: formatMoney(Math.round(totals.averageOrder), currency),
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
              {mode === 'commission' ? 'Commission due to Switch' : 'Gross sales for the period'}
            </td>
            <td className="tabular py-3 text-end text-[16px] font-bold">
              {formatMoney(mode === 'commission' ? totals.commission : totals.base, currency)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* On a statement the commission sits below the total, not inside it: the headline
          figure is what the restaurant traded, and the commission is a separate matter
          that the invoice above exists to bill. */}
      {mode === 'statement' && (
        <p className="text-caption mt-3 text-[#374151]">
          Commission owed to Switch on this period at {formatRate(totals.rate)}:{' '}
          <strong className="tabular">{formatMoney(totals.commission, currency)}</strong>
        </p>
      )}

      {/* Delivery and service fees are shown but kept visibly outside the sum: customers
          pay them on top of the food, they belong to the driver and the platform, and no
          commission is charged on either. */}
      <p className="text-caption mt-3 text-[#6b7280]">
        Charged to customers on top of the food and excluded from commission: delivery{' '}
        {formatMoney(totals.delivery, currency)}, service {formatMoney(totals.service, currency)}.
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
  return (
    <section className="mb-8">
      <p className="text-micro mb-2 font-bold tracking-[0.12em] text-[#6b7280] uppercase">
        Orders in this period
      </p>
      <table className="w-full text-[12px]">
        {/* thead, not a styled first row: the print CSS turns this into a repeating
            header so page 2 onward isn't a wall of unlabelled numbers. */}
        <thead>
          <tr className="bg-[#f3f4f6] text-start">
            <th className="px-2 py-2 text-start font-bold">Order</th>
            <th className="px-2 py-2 text-start font-bold">Date</th>
            <th className="px-2 py-2 text-start font-bold">Type</th>
            <th className="px-2 py-2 text-end font-bold">Items</th>
            <th className="px-2 py-2 text-end font-bold">Discount</th>
            <th className="px-2 py-2 text-end font-bold">Net</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const items = order.options?.itemsTotal ?? 0;
            const discount = order.options?.discount ?? 0;
            return (
              <tr key={order.objectId} className="border-b border-[#f3f4f6]">
                <td className="tabular px-2 py-1.5">#{shortId(order.objectId)}</td>
                <td className="tabular px-2 py-1.5">{formatDate(order.createdAt)}</td>
                <td className="px-2 py-1.5">
                  {order.deliveryType === 'pickup' ? 'Pickup' : 'Delivery'}
                </td>
                <td className="tabular px-2 py-1.5 text-end">{formatMoney(items, currency)}</td>
                <td className="tabular px-2 py-1.5 text-end">
                  {discount ? `−${formatMoney(discount, currency)}` : '—'}
                </td>
                <td className="tabular px-2 py-1.5 text-end font-bold">
                  {formatMoney(items - discount, currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function Footnote({ rate }: { rate: number }) {
  return (
    <footer className="border-t border-[#e5e7eb] pt-4 text-[11px] leading-relaxed text-[#6b7280]">
      <p>
        Figures cover orders that were not canceled and reached at least the &ldquo;on the
        way / ready&rdquo; stage, matching what the restaurant sees in its own Switch app.
      </p>
      <p className="mt-1">
        Orders are settled with the restaurant as they are taken, so the only balance shown here
        is the commission owed to Switch. It is calculated at the restaurant&apos;s current rate of{' '}
        {formatRate(rate)}, applied to items total less discounts. Orders do not store the rate
        that was in force when they were placed, so a later change to the rate will change the
        figures on a reprint of this period.
      </p>
    </footer>
  );
}
