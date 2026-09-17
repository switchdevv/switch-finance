import type { Order } from '@/types/order';

/**
 * An order's state is two fields, not one: `canceled` is a separate boolean that
 * overrides `status` entirely, and the labels for statuses 2 and 3 depend on whether the
 * order is delivered or collected. Both quirks are the backend's
 * (switch-food/src/configs/index.js:80-96) and are resolved here, once, so the table chip
 * and the spreadsheet can't disagree about what "3" means.
 */
const DELIVERY_STATES = ['placed', 'confirmed', 'onTheWay', 'delivered'] as const;
const PICKUP_STATES = ['placed', 'confirmed', 'readyForPickup', 'pickedUp'] as const;

export type OrderState =
  | (typeof DELIVERY_STATES)[number]
  | (typeof PICKUP_STATES)[number]
  | 'canceled'
  | 'unknown';

export function orderState(
  order: Pick<Order, 'status' | 'canceled' | 'deliveryType'>,
): { state: OrderState; step: number | undefined } {
  if (order.canceled) return { state: 'canceled', step: undefined };
  const states = order.deliveryType === 'pickup' ? PICKUP_STATES : DELIVERY_STATES;
  const { status } = order;
  if (status === undefined || status < 0 || status >= states.length) {
    return { state: 'unknown', step: undefined };
  }
  return { state: states[status], step: status };
}

/** The dictionary key for an order's state. */
export function orderStateKey(state: OrderState) {
  return `orders.status.${state}` as const;
}
