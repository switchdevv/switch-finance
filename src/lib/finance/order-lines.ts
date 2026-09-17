import type { Order } from '@/types/order';

/** All a line read needs off an order — narrow, so plain rows and `include`d ones both fit. */
type WithLines = Pick<Order, 'options' | 'food'>;

export type OrderLineRef = {
  /** Position in both `options.values` and `food`, which are index-aligned. */
  index: number;
  foodId: string;
  quantity: number;
  /** The line's total — `(dish price + extras) × quantity`, not a unit price despite the
   * name the app writes it under (switch-food/src/screens/Cart/Cart.js:129). Absent on
   * orders written before `values` carried prices. */
  price?: number;
};

/**
 * An order's lines as (dish id, quantity, line total) triples.
 *
 * `options.values` is index-aligned with the `food` pointer array and each entry is a
 * single-key record keyed by the dish's objectId — the same read the RN order screen does
 * (switch-food/src/screens/OrderDetails/OrderDetails.js:385). Orders written before
 * `values` existed still have the pointers, so those are the fallback and their quantity
 * is taken as one rather than guessed at.
 */
export function orderLines(order: WithLines): OrderLineRef[] {
  const values = order.options?.values ?? [];
  const pointers = order.food ?? [];
  const lines: OrderLineRef[] = [];

  for (let index = 0; index < Math.max(values.length, pointers.length); index += 1) {
    const entry = values[index] ? Object.entries(values[index])[0] : undefined;
    const foodId = entry?.[0] ?? pointers[index]?.objectId;
    if (!foodId) continue;
    const price = entry?.[1]?.price;
    lines.push({
      index,
      foodId,
      quantity: entry?.[1]?.quantity ?? 1,
      price: typeof price === 'number' && Number.isFinite(price) ? price : undefined,
    });
  }

  return lines;
}

/** Every dish id referenced across a range, to be resolved in one go. */
export function collectDishIds(orders: WithLines[]): string[] {
  const ids = new Set<string>();
  for (const order of orders) {
    for (const line of orderLines(order)) ids.add(line.foodId);
  }
  return [...ids];
}
