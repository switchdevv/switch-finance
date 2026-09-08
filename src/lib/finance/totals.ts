import type { Order } from '@/types/order';

/** All this needs off an order is its money blob — taking the narrow shape lets both the
 * plain rows and the `include`d ones (OrderWithUser) be summed without a cast. */
type Billable = Pick<Order, 'options'>;

export type OrderTotals = {
  ordersCount: number;
  /** Σ options.itemsTotal — the food subtotal before any discount. */
  itemsTotal: number;
  /** Σ options.discount — promo discounts, absorbed by the restaurant. */
  discount: number;
  /** itemsTotal − discount. The commission base, and what the merchant app calls
   * "Money Earned". */
  base: number;
  /** The rate applied, as a fraction (0.15 = 15%). */
  rate: number;
  /** base × rate, truncated. Switch's cut, owed by the restaurant. */
  commission: number;
  /** base ÷ ordersCount. */
  averageOrder: number;
  /** Σ options.delivery over orders that actually charged it — the driver's money. */
  delivery: number;
  /** Σ options.service — the platform's per-city service fee. */
  service: number;
  /** base + delivery + service. What customers paid in total. */
  grand: number;
};

/**
 * The one place money is computed, transcribed from switch-manager's Summary screen
 * (src/screens/Summary/Summary.js:80-91) so this dashboard and the merchant's own app
 * can't disagree:
 *
 *   base       = Σ itemsTotal − Σ discount
 *   commission = trunc(base × Restaurant.fee)
 *
 * Delivery and service fees are outside the base on purpose — neither is the
 * restaurant's revenue, so neither is commissionable.
 *
 * The `itemsTotal` truthiness guard is the RN app's, kept deliberately: an order with no
 * subtotal contributes nothing at all, including its discount. Dropping the guard would
 * make a zero-subtotal row subtract its discount from everyone else's revenue.
 *
 * There is deliberately no "net payable to the restaurant" figure here: orders are paid
 * to the restaurant when they're taken, so nothing is ever owed in that direction. The
 * only balance that exists is the commission the restaurant owes Switch.
 *
 * Caller must pass the restaurant's *current* `fee` — orders carry no rate snapshot, so
 * a rate change re-prices past periods. Every surface that shows a commission says so.
 */
export function computeTotals(orders: Billable[], fee: number | undefined): OrderTotals {
  const rate = fee ?? 0;

  let itemsTotal = 0;
  let discount = 0;
  let delivery = 0;
  let service = 0;
  let ordersCount = 0;

  for (const order of orders) {
    const options = order.options;
    if (!options?.itemsTotal) continue;

    ordersCount += 1;
    itemsTotal += options.itemsTotal;
    if (options.discount) discount += options.discount;
    // A free-delivery promo means the fee was absorbed by the platform, not charged —
    // counting it would inflate what customers actually paid.
    if (options.delivery && !options.freeDelivery) delivery += options.delivery;
    if (options.service) service += options.service;
  }

  const base = itemsTotal - discount;
  const commission = Math.trunc(base * rate);

  return {
    ordersCount,
    itemsTotal,
    discount,
    base,
    rate,
    commission,
    averageOrder: ordersCount > 0 ? base / ordersCount : 0,
    delivery,
    service,
    grand: base + delivery + service,
  };
}
