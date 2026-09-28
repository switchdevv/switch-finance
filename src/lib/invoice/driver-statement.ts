import { hasCarryOver, NO_CARRY_OVER, type CarryOver } from '@/lib/finance/carry-over';
import {
  balanceOf,
  earningOf,
  isCash,
  serviceOf,
} from '@/lib/finance/driver-settlement';
import { shortId, type Formatters } from '@/lib/format';
import type { MessageKey, Translate } from '@/lib/i18n/dictionary';
import type { CurrencyCode } from '@/types/city';
import type { DriverOrder } from '@/types/order';
import {
  CARRY_OVER_NOTE_PARAM,
  CARRY_OVER_PARAM,
  COLUMNS_PARAM,
  readCarryOver,
} from './options';

/**
 * A driver's printed statement: which document, which columns, anything carried over — all
 * in the link, like a restaurant's invoice (./options.ts), so the Statement button, the
 * document's own Print dialog and a colleague's pasted link produce the same page.
 *
 * `settlement` is the balance between the driver and Switch for the period; `earnings` is
 * the driver's own record of what they delivered and earned, with the balance for
 * information only.
 */
export type StatementMode = 'settlement' | 'earnings';

export const STATEMENT_MODES: readonly StatementMode[] = ['settlement', 'earnings'];

export type StatementColumnKey =
  | 'id'
  | 'date'
  | 'restaurant'
  | 'payment'
  | 'service'
  | 'delivery'
  | 'balance';

type CellContext = { t: Translate; format: Formatters; currency: CurrencyCode | undefined };

export type StatementColumn = {
  key: StatementColumnKey;
  label: MessageKey;
  align: 'start' | 'end';
  isStrong?: boolean;
  cell: (order: DriverOrder, context: CellContext) => string;
};

/** Signed like the balance: + the driver owes Switch, − Switch owes the driver. */
export function signedMoney(value: number, format: Formatters, currency: CurrencyCode | undefined) {
  if (value === 0) return format.money(0, currency);
  return `${value > 0 ? '+' : '−'}${format.money(Math.abs(value), currency)}`;
}

export const STATEMENT_COLUMNS: readonly StatementColumn[] = [
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
    key: 'restaurant',
    label: 'driverSheet.fields.restaurant',
    align: 'start',
    cell: (order) => order.restaurant?.name ?? '—',
  },
  {
    key: 'payment',
    label: 'sheet.fields.payment',
    align: 'start',
    cell: (order, { t }) =>
      `${isCash(order) ? t('sheet.payment.cash') : t('sheet.payment.card')}${
        order.options?.freeDelivery ? ` · ${t('driverFinance.freeShort')}` : ''
      }`,
  },
  {
    key: 'service',
    label: 'sheet.fields.service',
    align: 'end',
    cell: (order, { format, currency }) => format.money(serviceOf(order), currency),
  },
  {
    key: 'delivery',
    label: 'driverSheet.fields.delivery',
    align: 'end',
    cell: (order, { format, currency }) => format.money(earningOf(order), currency),
  },
  {
    key: 'balance',
    label: 'driverSheet.fields.balance',
    align: 'end',
    isStrong: true,
    cell: (order, { format, currency }) => signedMoney(balanceOf(order) ?? 0, format, currency),
  },
];

export const DEFAULT_STATEMENT_COLUMNS: readonly StatementColumnKey[] = STATEMENT_COLUMNS.map(
  (column) => column.key,
);

export type StatementOptions = {
  columns: StatementColumnKey[];
  carryOver: CarryOver;
};

export const MODE_PARAM = 'mode';

type ReadableParams = Pick<URLSearchParams, 'get' | 'has'>;

export function defaultStatementOptions(): StatementOptions {
  return { columns: [...DEFAULT_STATEMENT_COLUMNS], carryOver: NO_CARRY_OVER };
}

export function readStatementMode(params: ReadableParams): StatementMode {
  return params.get(MODE_PARAM) === 'earnings' ? 'earnings' : 'settlement';
}

export function readStatementOptions(params: ReadableParams): StatementOptions {
  let columns = [...DEFAULT_STATEMENT_COLUMNS];
  if (params.has(COLUMNS_PARAM)) {
    const asked = new Set((params.get(COLUMNS_PARAM) ?? '').split(',').map((key) => key.trim()));
    columns = STATEMENT_COLUMNS.filter((column) => asked.has(column.key)).map((column) => column.key);
  }
  return { columns, carryOver: readCarryOver(params) };
}

/** Mutates `params`, leaving the driver, the period and the mode alone. */
export function writeStatementOptions(params: URLSearchParams, options: StatementOptions): void {
  const picked = new Set(options.columns);
  params.set(
    COLUMNS_PARAM,
    STATEMENT_COLUMNS.filter((column) => picked.has(column.key))
      .map((column) => column.key)
      .join(','),
  );
  params.delete(CARRY_OVER_PARAM);
  params.delete(CARRY_OVER_NOTE_PARAM);
  if (!hasCarryOver(options.carryOver)) return;
  params.set(CARRY_OVER_PARAM, String(options.carryOver.amount));
  if (options.carryOver.note) params.set(CARRY_OVER_NOTE_PARAM, options.carryOver.note);
}
