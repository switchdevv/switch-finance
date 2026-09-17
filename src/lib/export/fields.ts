import { orderLines } from '@/lib/finance/order-lines';
import { orderState, orderStateKey } from '@/lib/finance/order-status';
import { shortId } from '@/lib/format';
import type { Formatters } from '@/lib/format';
import type { MessageKey, Translate } from '@/lib/i18n/dictionary';
import type { DishCatalogue } from '@/lib/services/foods';
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

/** Everything a row needs beyond the order itself — including the language it is being
 * written in, since several columns hold words rather than figures. */
export type ExportRowContext = {
  t: Translate;
  /** Only the date/time columns hand `Intl` a value; everything else is a raw number, so
   * that the recipient's Excel formats it with their own separators. */
  format: Formatters;
  /** The dishes the orders reference, from lib/services/foods — for the Products column.
   * A dish missing from it falls back to a short id. */
  dishes: DishCatalogue;
  /** The restaurant's current commission rate, as a fraction (0.15 = 15%) — for the
   * Commission column's per-order calculation. */
  rate: number;
};

export type ExportField = {
  key: ExportFieldKey;
  /** Dictionary keys, not words: the column picker and the sheet header are both written
   * in the language the dashboard is set to when the file is made. */
  label: MessageKey;
  width: number;
  kind: ExportFieldKind;
  /** Second line under the checkbox, for columns whose contents the label alone doesn't
   * settle. */
  hint?: MessageKey;
  value: (order: OrderWithUser, context: ExportRowContext) => string | number | Date;
};

export const EXPORT_FIELDS: readonly ExportField[] = [
  {
    key: 'date',
    label: 'sheet.fields.date',
    width: 12,
    kind: 'date',
    value: (o) => new Date(o.createdAt),
  },
  {
    key: 'time',
    label: 'sheet.fields.time',
    width: 9,
    kind: 'time',
    value: (o) => new Date(o.createdAt),
  },
  {
    key: 'id',
    label: 'sheet.fields.id',
    width: 14,
    kind: 'text',
    value: (order) => `#${shortId(order.objectId)}`,
  },
  {
    key: 'type',
    label: 'sheet.fields.type',
    width: 12,
    kind: 'text',
    value: (order, { t }) =>
      order.deliveryType === 'pickup' ? t('common.pickup') : t('common.delivery'),
  },
  {
    key: 'customer',
    label: 'sheet.fields.customer',
    width: 26,
    kind: 'text',
    value: (order) => order.user?.fullname ?? '',
  },
  {
    key: 'status',
    label: 'sheet.fields.status',
    width: 16,
    kind: 'text',
    value: (order, { t }) => t(orderStateKey(orderState(order).state)),
  },
  {
    key: 'products',
    label: 'sheet.fields.products',
    width: 60,
    kind: 'text',
    hint: 'sheet.fields.productsHint',
    value: formatProducts,
  },
  {
    key: 'items',
    label: 'sheet.fields.items',
    width: 14,
    kind: 'money',
    value: (order) => order.options?.itemsTotal ?? 0,
  },
  {
    key: 'discount',
    label: 'sheet.fields.discount',
    width: 14,
    kind: 'money',
    value: (order) => order.options?.discount ?? 0,
  },
  {
    key: 'net',
    label: 'sheet.fields.net',
    width: 14,
    kind: 'money',
    value: (order) => (order.options?.itemsTotal ?? 0) - (order.options?.discount ?? 0),
  },
  {
    key: 'commission',
    label: 'sheet.fields.commission',
    width: 14,
    kind: 'money',
    hint: 'sheet.fields.commissionHint',
    value: (order, context) =>
      Math.trunc(
        ((order.options?.itemsTotal ?? 0) - (order.options?.discount ?? 0)) * context.rate,
      ),
  },
  {
    key: 'delivery',
    label: 'sheet.fields.delivery',
    width: 14,
    kind: 'money',
    value: (order) => (order.options?.freeDelivery ? 0 : (order.options?.delivery ?? 0)),
  },
  {
    key: 'service',
    label: 'sheet.fields.service',
    width: 14,
    kind: 'money',
    value: (order) => order.options?.service ?? 0,
  },
  {
    key: 'payment',
    label: 'sheet.fields.payment',
    width: 12,
    kind: 'text',
    value: (order, { t }) =>
      order.options?.paymentMethod === 'creditcards' ? t('sheet.payment.card') : t('sheet.payment.cash'),
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

/** The one column that needs the dish lookup — the panel checks for it before waiting on
 * it. */
export const PRODUCTS_FIELD: ExportFieldKey = 'products';

/**
 * The Products cell: plain inline text, comma-separated, quantities only where there's
 * more than one. A dish whose name couldn't be resolved is shown by id rather than
 * silently vanishing from a line the money columns still count.
 */
function formatProducts(order: OrderWithUser, context: ExportRowContext): string {
  return orderLines(order)
    .map(({ foodId, quantity }) => {
      const name = context.dishes.get(foodId)?.name ?? `#${shortId(foodId)}`;
      return quantity > 1 ? `${name} ×${quantity}` : name;
    })
    .join(', ');
}

