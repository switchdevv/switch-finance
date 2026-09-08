import { shortId } from '@/lib/format';
import type { OrderWithUser } from '@/types/order';

/**
 * The columns the orders spreadsheet can carry. The user picks a subset in the export
 * modal; the sheet's column order is always this file's order, never the order they were
 * ticked in, so two exports of the same restaurant line up side by side.
 */
export type ExportFieldKey =
  | 'id'
  | 'date'
  | 'time'
  | 'customer'
  | 'type'
  | 'status'
  | 'items'
  | 'discount'
  | 'net'
  | 'commission'
  | 'delivery'
  | 'service'
  | 'payment'
  | 'products';

/** What the cell holds, which is all the writer needs to know to format it: `money`
 * additionally marks the columns that get a total at the bottom of the sheet. */
export type ExportFieldKind = 'text' | 'date' | 'time' | 'money';

/** Everything a row needs beyond the order itself. */
export type ExportRowContext = {
  /** Food objectId → dish name, from lib/services/foods. Empty when the Products column
   * wasn't selected; lines then fall back to a short id. */
  productNames: Map<string, string>;
  /** The restaurant's current commission rate, as a fraction (0.15 = 15%) — for the
   * Commission column's per-order calculation. */
  rate: number;
};

export type ExportField = {
  key: ExportFieldKey;
  label: string;
  width: number;
  kind: ExportFieldKind;
  /** Second line under the checkbox, for columns whose contents the label alone doesn't
   * settle. */
  hint?: string;
  value: (order: OrderWithUser, context: ExportRowContext) => string | number | Date;
};

export const EXPORT_FIELDS: readonly ExportField[] = [
  { key: 'date', label: 'Date', width: 12, kind: 'date', value: (o) => new Date(o.createdAt) },
  { key: 'time', label: 'Time', width: 9, kind: 'time', value: (o) => new Date(o.createdAt) },
  {
    key: 'id',
    label: 'Order',
    width: 14,
    kind: 'text',
    value: (order) => `#${shortId(order.objectId)}`,
  },
  {
    key: 'type',
    label: 'Type',
    width: 12,
    kind: 'text',
    value: (order) => (order.deliveryType === 'pickup' ? 'Pickup' : 'Delivery'),
  },
  {
    key: 'customer',
    label: 'Customer',
    width: 26,
    kind: 'text',
    value: (order) => order.user?.fullname ?? '',
  },
  { key: 'status', label: 'Status', width: 16, kind: 'text', value: statusLabel },
  {
    key: 'products',
    label: 'Products',
    width: 60,
    kind: 'text',
    hint: 'The dishes ordered, e.g. “Kefta ×2, Coke”',
    value: formatProducts,
  },
  {
    key: 'items',
    label: 'Price',
    width: 14,
    kind: 'money',
    value: (order) => order.options?.itemsTotal ?? 0,
  },
  {
    key: 'discount',
    label: 'Discount',
    width: 14,
    kind: 'money',
    value: (order) => order.options?.discount ?? 0,
  },
  {
    key: 'net',
    label: 'Net sales',
    width: 14,
    kind: 'money',
    value: (order) => (order.options?.itemsTotal ?? 0) - (order.options?.discount ?? 0),
  },
  {
    key: 'commission',
    label: 'Commission',
    width: 14,
    kind: 'money',
    hint: 'Calculated from the order total using the restaurant’s commission rate — not stored on the order.',
    value: (order, context) =>
      Math.trunc(
        ((order.options?.itemsTotal ?? 0) - (order.options?.discount ?? 0)) * context.rate,
      ),
  },
  {
    key: 'delivery',
    label: 'Delivery fee',
    width: 14,
    kind: 'money',
    value: (order) => (order.options?.freeDelivery ? 0 : (order.options?.delivery ?? 0)),
  },
  {
    key: 'service',
    label: 'Service fee',
    width: 14,
    kind: 'money',
    value: (order) => order.options?.service ?? 0,
  },
  {
    key: 'payment',
    label: 'Payment',
    width: 12,
    kind: 'text',
    value: (order) => (order.options?.paymentMethod === 'creditcards' ? 'Card' : 'Cash'),
  },
];

/** The columns an export starts with unselected — the rest are opt-in via the modal. */
export const DEFAULT_EXPORT_FIELDS: readonly ExportFieldKey[] = [
  'date',
  'time',
  'id',
  'type',
  'products',
  'items',
  'commission',
];

/** The one column that costs an extra round trip — the panel checks for it before paying
 * for the dish names. */
export const PRODUCTS_FIELD: ExportFieldKey = 'products';

type OrderLineRef = { foodId: string; quantity: number };

/**
 * An order's lines as (dish id, quantity) pairs.
 *
 * `options.values` is index-aligned with the `food` pointer array and each entry is a
 * single-key record keyed by the dish's objectId — the same read the RN order screen does
 * (switch-food/src/screens/OrderDetails/OrderDetails.js:385). Orders written before
 * `values` existed still have the pointers, so those are the fallback and their quantity
 * is taken as one rather than guessed at.
 */
function orderLines(order: OrderWithUser): OrderLineRef[] {
  const values = order.options?.values ?? [];
  const pointers = order.food ?? [];
  const lines: OrderLineRef[] = [];

  for (let index = 0; index < Math.max(values.length, pointers.length); index += 1) {
    const entry = values[index] ? Object.entries(values[index])[0] : undefined;
    const foodId = entry?.[0] ?? pointers[index]?.objectId;
    if (!foodId) continue;
    lines.push({ foodId, quantity: entry?.[1]?.quantity ?? 1 });
  }

  return lines;
}

/** Every dish id referenced across a range, to be resolved to names in one go. */
export function collectProductIds(orders: OrderWithUser[]): string[] {
  const ids = new Set<string>();
  for (const order of orders) {
    for (const line of orderLines(order)) ids.add(line.foodId);
  }
  return [...ids];
}

/**
 * The Products cell: plain inline text, comma-separated, quantities only where there's
 * more than one. A dish whose name couldn't be resolved is shown by id rather than
 * silently vanishing from a line the money columns still count.
 */
function formatProducts(order: OrderWithUser, context: ExportRowContext): string {
  return orderLines(order)
    .map(({ foodId, quantity }) => {
      const name = context.productNames.get(foodId) ?? `#${shortId(foodId)}`;
      return quantity > 1 ? `${name} ×${quantity}` : name;
    })
    .join(', ');
}

function statusLabel(order: OrderWithUser): string {
  if (order.canceled) return 'Canceled';
  const labels =
    order.deliveryType === 'pickup'
      ? ['Placed', 'Confirmed', 'Ready for pickup', 'Picked up']
      : ['Placed', 'Confirmed', 'On the way', 'Delivered'];
  return order.status !== undefined ? (labels[order.status] ?? 'Unknown') : 'Unknown';
}
