import type { Order } from '@/types/order';

/**
 * What a driver and Switch owe each other for the orders they delivered — the money side of
 * a driver, where the wallet (lib/finance/wallet.ts) is the prepaid side of the same thing.
 *
 * The per-order rule is switch-dashboard's, as switch-ops transcribes it
 * (src/lib/ops/driver-settlement.ts) and as switch-server-v2's wallet uses it (D-25):
 *
 *   paid in cash:  freeDelivery ? service − delivery : service
 *   otherwise:     −delivery
 *
 * On a cash order the driver collects the whole total: they hand the food to the restaurant,
 * keep the delivery fee as their pay, and still hold Switch's service fee. A free delivery
 * was never charged to the customer, so Switch owes the driver that fee back out of what they
 * hold. On a card order the driver collects nothing and Switch owes them the delivery fee.
 *
 * **Sign convention:** positive, the driver owes Switch; negative, Switch owes the driver.
 *
 * **Which orders count:** delivered ones only — status 3, not canceled — which is the
 * wallet's rule, so this tab and the Wallet tab describe the same deliveries. switch-ops
 * also counts orders still on the road (status 2); on a live day its balance can be ahead of
 * this one by those.
 */

export const DELIVERED_STATUS = 3;

type Settleable = Pick<Order, 'canceled' | 'status' | 'deliveryType' | 'options'>;

/** The order is part of the driver's settlement. */
export function isDelivered(order: Pick<Order, 'canceled' | 'status'>): boolean {
  return !order.canceled && order.status === DELIVERED_STATUS;
}

function amount(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function isCash(order: Pick<Order, 'options'>): boolean {
  return order.options?.paymentMethod === 'cash';
}

/** What the driver took from the customer's hand: nothing on a card order; otherwise the
 * food after discount, the service fee and the delivery fee — unless the delivery was free. */
export function cashCollectedOf(order: Settleable): number {
  if (!isCash(order)) return 0;
  const options = order.options ?? {};
  return (
    amount(options.itemsTotal) -
    amount(options.discount) +
    amount(options.service) +
    (options.freeDelivery ? 0 : amount(options.delivery))
  );
}

/** The food, net of discount: what the driver paid the restaurant at pickup on a cash order. */
export function foodOf(order: Settleable): number {
  const options = order.options ?? {};
  return amount(options.itemsTotal) - amount(options.discount);
}

/** The driver's pay for the delivery — from the customer, or from Switch on a free one. */
export function earningOf(order: Settleable): number {
  return amount(order.options?.delivery);
}

/** Switch's service fee on the order, whoever holds it. */
export function serviceOf(order: Settleable): number {
  return amount(order.options?.service);
}

/** One order's contribution to the balance, or null when it doesn't count. */
export function balanceOf(order: Settleable): number | null {
  if (!isDelivered(order)) return null;
  const service = serviceOf(order);
  const delivery = earningOf(order);
  if (isCash(order)) return order.options?.freeDelivery ? service - delivery : service;
  return -delivery;
}

export type DriverSettlement = {
  /** Every order the driver was on in the period, whatever became of it. */
  total: number;
  delivered: number;
  canceled: number;
  /** Not canceled, not delivered yet — on the road, or waiting to be collected. */
  open: number;
  /** Of the delivered: paid in cash, any other way, and with free delivery. */
  cash: number;
  card: number;
  freeDelivery: number;
  /** Σ what the driver took in cash from customers. */
  cashCollected: number;
  /** Σ the food on cash orders: handed to the restaurants at pickup. */
  foodPaid: number;
  /** Σ delivery fees on delivered orders: the driver's pay for the period. */
  earnings: number;
  /** Σ service fees the driver holds for Switch (cash orders). */
  serviceHeld: number;
  /** Σ service fees on card orders — Switch already has them. For information. */
  serviceCard: number;
  /** Σ delivery fees Switch owes the driver back: free deliveries paid in cash. */
  freeDeliveryOwed: number;
  /** Σ delivery fees Switch owes the driver: card orders. */
  cardDeliveryOwed: number;
  /** serviceHeld − freeDeliveryOwed − cardDeliveryOwed. Positive: the driver owes Switch. */
  net: number;
  /** earnings ÷ delivered. */
  averageEarning: number;
};

export function settle(orders: readonly Settleable[]): DriverSettlement {
  const s: DriverSettlement = {
    total: orders.length,
    delivered: 0,
    canceled: 0,
    open: 0,
    cash: 0,
    card: 0,
    freeDelivery: 0,
    cashCollected: 0,
    foodPaid: 0,
    earnings: 0,
    serviceHeld: 0,
    serviceCard: 0,
    freeDeliveryOwed: 0,
    cardDeliveryOwed: 0,
    net: 0,
    averageEarning: 0,
  };

  for (const order of orders) {
    if (order.canceled) {
      s.canceled += 1;
      continue;
    }
    if (!isDelivered(order)) {
      s.open += 1;
      continue;
    }

    s.delivered += 1;
    const delivery = earningOf(order);
    const service = serviceOf(order);
    s.earnings += delivery;
    if (order.options?.freeDelivery) s.freeDelivery += 1;

    if (isCash(order)) {
      s.cash += 1;
      s.cashCollected += cashCollectedOf(order);
      s.foodPaid += foodOf(order);
      s.serviceHeld += service;
      if (order.options?.freeDelivery) s.freeDeliveryOwed += delivery;
    } else {
      s.card += 1;
      s.serviceCard += service;
      s.cardDeliveryOwed += delivery;
    }
  }

  s.net = s.serviceHeld - s.freeDeliveryOwed - s.cardDeliveryOwed;
  s.averageEarning = s.delivered > 0 ? s.earnings / s.delivered : 0;
  return s;
}

/**
 * The period's delivered orders split at the day the driver's wallet started counting: those
 * from then on were settled in prepaid orders (the Wallet tab), the ones before were not.
 * Without a wallet, nothing was prepaid.
 */
export function splitByWallet<T extends Settleable & Pick<Order, 'createdAt'>>(
  orders: readonly T[],
  walletStartsAt: string | null | undefined,
): { prepaid: T[]; outside: T[] } {
  if (!walletStartsAt) return { prepaid: [], outside: [...orders] };
  const from = new Date(walletStartsAt).getTime();
  const prepaid: T[] = [];
  const outside: T[] = [];
  for (const order of orders) {
    (new Date(order.createdAt).getTime() >= from ? prepaid : outside).push(order);
  }
  return { prepaid, outside };
}

/**
 * What is left to settle by hand for a period: the balance of the deliveries the wallet
 * didn't cover, plus anything carried over from before. Positive: the driver owes Switch.
 */
export type SettlementDue = {
  /** The whole period's balance. */
  net: number;
  /** Of it, settled through the prepaid wallet. */
  prepaid: number;
  /** net − prepaid. */
  outstanding: number;
  /** Typed on the export/print dialog — signed like everything else. */
  carriedOver: number;
  /** outstanding + carriedOver. */
  due: number;
};

export function settlementDue<T extends Settleable & Pick<Order, 'createdAt'>>(
  orders: readonly T[],
  walletStartsAt: string | null | undefined,
  carriedOver = 0,
): SettlementDue {
  const net = settle(orders).net;
  const prepaid = settle(splitByWallet(orders, walletStartsAt).prepaid).net;
  const outstanding = net - prepaid;
  return { net, prepaid, outstanding, carriedOver, due: outstanding + carriedOver };
}

export type DayFigures = {
  /** YYYY-MM-DD, Algiers. */
  day: string;
  delivered: number;
  earnings: number;
  net: number;
};

/**
 * Delivered orders per Algiers day, every day of the period present (a quiet day is a zero,
 * not a gap), oldest first.
 */
export function byDay<T extends Settleable & Pick<Order, 'createdAt'>>(
  orders: readonly T[],
  days: readonly string[],
  dayOf: (iso: string) => string,
): DayFigures[] {
  const map = new Map<string, DayFigures>(
    days.map((day) => [day, { day, delivered: 0, earnings: 0, net: 0 }]),
  );
  for (const order of orders) {
    const balance = balanceOf(order);
    if (balance === null) continue;
    const entry = map.get(dayOf(order.createdAt));
    if (!entry) continue;
    entry.delivered += 1;
    entry.earnings += earningOf(order);
    entry.net += balance;
  }
  return [...map.values()];
}
