import { shortId, type Formatters } from '@/lib/format';
import type { MessageKey, Translate } from '@/lib/i18n/dictionary';
import type { CurrencyCode } from '@/types/city';
import type { OrderWithUser } from '@/types/order';

/**
 * The columns the invoice's line-item table can carry.
 *
 * Deliberately a much shorter list than the spreadsheet's (lib/export/fields.ts): this
 * table has to fit across A4 next to a restaurant's name, so the columns on offer are the
 * ones a printed invoice can hold without spilling. The printed order is always this
 * file's order, never the order they were ticked in, so two invoices for the same
 * restaurant read the same way.
 */
export type InvoiceColumnKey = 'id' | 'date' | 'type' | 'items' | 'discount' | 'net';

type CellContext = {
  t: Translate;
  format: Formatters;
  currency: CurrencyCode | undefined;
};

export type InvoiceColumn = {
  key: InvoiceColumnKey;
  /** A dictionary key, not a word: the document prints in whichever language it is set
   * to when it is printed. */
  label: MessageKey;
  /** Money reads right, words read left. */
  align: 'start' | 'end';
  /** Net is the figure the eye lands on, so it stays bold wherever it ends up sitting. */
  isStrong?: boolean;
  cell: (order: OrderWithUser, context: CellContext) => string;
};

const items = (order: OrderWithUser) => order.options?.itemsTotal ?? 0;
const discount = (order: OrderWithUser) => order.options?.discount ?? 0;

export const INVOICE_COLUMNS: readonly InvoiceColumn[] = [
  {
    key: 'id',
    label: 'invoice.lines.order',
    align: 'start',
    cell: (order) => `#${shortId(order.objectId)}`,
  },
  {
    key: 'date',
    label: 'invoice.lines.date',
    align: 'start',
    cell: (order, { format }) => format.date(order.createdAt),
  },
  {
    key: 'type',
    label: 'invoice.lines.type',
    align: 'start',
    cell: (order, { t }) =>
      order.deliveryType === 'pickup' ? t('common.pickup') : t('common.delivery'),
  },
  {
    key: 'items',
    label: 'invoice.lines.items',
    align: 'end',
    cell: (order, { format, currency }) => format.money(items(order), currency),
  },
  {
    key: 'discount',
    label: 'invoice.lines.discount',
    align: 'end',
    // An em dash rather than a zero: a row with no promo on it shouldn't read as a
    // discount that happened to come to nothing.
    cell: (order, { format, currency }) =>
      discount(order) ? `−${format.money(discount(order), currency)}` : '—',
  },
  {
    key: 'net',
    label: 'invoice.lines.net',
    align: 'end',
    isStrong: true,
    cell: (order, { format, currency }) =>
      format.money(items(order) - discount(order), currency),
  },
];

/** Everything, which is what the invoice printed before the columns became a choice. */
export const DEFAULT_INVOICE_COLUMNS: readonly InvoiceColumnKey[] = INVOICE_COLUMNS.map(
  (column) => column.key,
);
