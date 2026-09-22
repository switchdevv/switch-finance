import { hasCarryOver, NO_CARRY_OVER, type CarryOver } from '@/lib/finance/carry-over';
import { DEFAULT_INVOICE_COLUMNS, INVOICE_COLUMNS, type InvoiceColumnKey } from './columns';

/**
 * Everything the print dialog decides about an invoice, and how it rides in the link.
 *
 * All of it is in the URL rather than in component state because the two places an
 * invoice is configured — the dialog on the restaurant page, which opens the document in
 * a new tab, and the dialog on the document itself — have no state in common. The link is
 * the only thing that passes between them, and it doubles as the way a colleague reprints
 * exactly the same document.
 */
export type InvoiceOptions = {
  /** Menu sections the document is narrowed to; empty is the whole restaurant. */
  categoryIds: string[];
  /** Which columns the line-item table prints. Empty prints no table at all. */
  columns: InvoiceColumnKey[];
  /** Owed from before the period — see lib/finance/carry-over.ts. */
  carryOver: CarryOver;
};

export const CATEGORIES_PARAM = 'categories';
export const COLUMNS_PARAM = 'cols';
export const CARRY_OVER_PARAM = 'carry';
export const CARRY_OVER_NOTE_PARAM = 'carrynote';

type ReadableParams = Pick<URLSearchParams, 'get' | 'has'>;

export function defaultInvoiceOptions(): InvoiceOptions {
  return {
    categoryIds: [],
    columns: [...DEFAULT_INVOICE_COLUMNS],
    carryOver: NO_CARRY_OVER,
  };
}

export function readInvoiceOptions(params: ReadableParams): InvoiceOptions {
  return {
    categoryIds: readCategoryIds(params),
    columns: readColumns(params),
    carryOver: readCarryOver(params),
  };
}

/** Mutates `params` in place, leaving everything else in the query string alone — the
 * invoice link also carries the restaurant and the date range. */
export function writeInvoiceOptions(params: URLSearchParams, options: InvoiceOptions): void {
  if (options.categoryIds.length > 0) params.set(CATEGORIES_PARAM, options.categoryIds.join(','));
  else params.delete(CATEGORIES_PARAM);

  // Written even when it's the full set, and even when it's empty ('cols=' is a document
  // with no line-item table): a link that omits it means "whatever the invoice prints by
  // default", which is not the same statement.
  params.set(COLUMNS_PARAM, orderedColumns(options.columns).join(','));

  params.delete(CARRY_OVER_PARAM);
  params.delete(CARRY_OVER_NOTE_PARAM);
  if (!hasCarryOver(options.carryOver)) return;
  params.set(CARRY_OVER_PARAM, String(options.carryOver.amount));
  if (options.carryOver.note) params.set(CARRY_OVER_NOTE_PARAM, options.carryOver.note);
}

/** The categories an invoice link is narrowed to, deduplicated; empty for the whole
 * restaurant. */
export function readCategoryIds(params: ReadableParams): string[] {
  const raw = params.get(CATEGORIES_PARAM) ?? '';
  return [...new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))];
}

/**
 * The columns a link asks for. A link that says nothing about them gets the default set —
 * which is what every invoice link written before this parameter existed looks like, and
 * what the Invoice button produces if the dialog is bypassed.
 */
function readColumns(params: ReadableParams): InvoiceColumnKey[] {
  if (!params.has(COLUMNS_PARAM)) return [...DEFAULT_INVOICE_COLUMNS];
  const asked = new Set(
    (params.get(COLUMNS_PARAM) ?? '').split(',').map((key) => key.trim()),
  );
  // Filtered through INVOICE_COLUMNS rather than trusted: this decides what a document
  // sent to a restaurant contains, and a hand-edited link shouldn't be able to put an
  // unknown key in it.
  return INVOICE_COLUMNS.filter((column) => asked.has(column.key)).map((column) => column.key);
}

/** The outstanding balance a link carries; nothing when it carries none, or when the
 * value in it isn't a positive amount. */
function readCarryOver(params: ReadableParams): CarryOver {
  const amount = Number(params.get(CARRY_OVER_PARAM));
  if (!Number.isFinite(amount) || amount <= 0) return NO_CARRY_OVER;
  return {
    amount: Math.round(amount),
    note: params.get(CARRY_OVER_NOTE_PARAM)?.trim() ?? '',
  };
}

/** INVOICE_COLUMNS' own order, never the order they were ticked in, so the same selection
 * always produces the same link. */
function orderedColumns(columns: readonly InvoiceColumnKey[]): InvoiceColumnKey[] {
  const picked = new Set(columns);
  return INVOICE_COLUMNS.filter((column) => picked.has(column.key)).map((column) => column.key);
}
