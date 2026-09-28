import {
  balanceOf,
  cashCollectedOf,
  earningOf,
  foodOf,
  isCash,
  serviceOf,
} from '@/lib/finance/driver-settlement';
import { shortId, type Formatters } from '@/lib/format';
import type { MessageKey, Translate } from '@/lib/i18n/dictionary';
import type { DriverOrder } from '@/types/order';

/**
 * The columns a driver's settlement sheet can carry — the driver's counterpart of
 * lib/export/fields.ts. The sheet's column order is always this file's order.
 */
export type DriverFieldKey =
  | 'date'
  | 'time'
  | 'id'
  | 'restaurant'
  | 'payment'
  | 'freeDelivery'
  | 'settledBy'
  | 'collected'
  | 'food'
  | 'service'
  | 'delivery'
  | 'balance';

export type DriverFieldKind = 'text' | 'date' | 'time' | 'money';

export type DriverRowContext = {
  t: Translate;
  format: Formatters;
  /** When the driver's wallet started counting, if they have one: deliveries from then on
   * were settled in prepaid orders. */
  walletStartsAt: string | null;
};

export type DriverField = {
  key: DriverFieldKey;
  label: MessageKey;
  width: number;
  kind: DriverFieldKind;
  hint?: MessageKey;
  value: (order: DriverOrder, context: DriverRowContext) => string | number | Date;
};

export const DRIVER_FIELDS: readonly DriverField[] = [
  { key: 'date', label: 'sheet.fields.date', width: 12, kind: 'date', value: (o) => new Date(o.createdAt) },
  { key: 'time', label: 'sheet.fields.time', width: 9, kind: 'time', value: (o) => new Date(o.createdAt) },
  {
    key: 'id',
    label: 'sheet.fields.id',
    width: 14,
    kind: 'text',
    value: (order) => `#${shortId(order.objectId)}`,
  },
  {
    key: 'restaurant',
    label: 'driverSheet.fields.restaurant',
    width: 26,
    kind: 'text',
    value: (order) => order.restaurant?.name ?? '',
  },
  {
    key: 'payment',
    label: 'sheet.fields.payment',
    width: 12,
    kind: 'text',
    value: (order, { t }) => (isCash(order) ? t('sheet.payment.cash') : t('sheet.payment.card')),
  },
  {
    key: 'freeDelivery',
    label: 'driverSheet.fields.freeDelivery',
    width: 14,
    kind: 'text',
    value: (order, { t }) => (order.options?.freeDelivery ? t('driverSheet.yes') : ''),
  },
  {
    key: 'settledBy',
    label: 'driverSheet.fields.settledBy',
    width: 16,
    kind: 'text',
    hint: 'driverSheet.fields.settledByHint',
    value: (order, { t, walletStartsAt }) =>
      walletStartsAt && new Date(order.createdAt) >= new Date(walletStartsAt)
        ? t('driverSheet.settled.wallet')
        : t('driverSheet.settled.hand'),
  },
  {
    key: 'collected',
    label: 'driverSheet.fields.collected',
    width: 15,
    kind: 'money',
    hint: 'driverSheet.fields.collectedHint',
    value: (order) => cashCollectedOf(order),
  },
  {
    key: 'food',
    label: 'driverSheet.fields.food',
    width: 15,
    kind: 'money',
    hint: 'driverSheet.fields.foodHint',
    value: (order) => (isCash(order) ? foodOf(order) : 0),
  },
  {
    key: 'service',
    label: 'sheet.fields.service',
    width: 14,
    kind: 'money',
    value: (order) => serviceOf(order),
  },
  {
    key: 'delivery',
    label: 'driverSheet.fields.delivery',
    width: 14,
    kind: 'money',
    hint: 'driverSheet.fields.deliveryHint',
    value: (order) => earningOf(order),
  },
  {
    key: 'balance',
    label: 'driverSheet.fields.balance',
    width: 14,
    kind: 'money',
    hint: 'driverSheet.fields.balanceHint',
    value: (order) => balanceOf(order) ?? 0,
  },
];

export const DEFAULT_DRIVER_FIELDS: readonly DriverFieldKey[] = [
  'date',
  'time',
  'id',
  'restaurant',
  'payment',
  'service',
  'delivery',
  'balance',
];
