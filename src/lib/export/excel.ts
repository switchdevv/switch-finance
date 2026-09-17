import type { DateRange } from '@/lib/finance/date-range';
import type { OrderTotals } from '@/lib/finance/totals';
import type { Formatters } from '@/lib/format';
import type { Translate, TranslateCount } from '@/lib/i18n/dictionary';
import type { DishCatalogue } from '@/lib/services/foods';
import type { CurrencyCode } from '@/types/city';
import type { OrderWithUser } from '@/types/order';
import {
  EXPORT_FIELDS,
  type ExportField,
  type ExportFieldKey,
  type ExportRowContext,
} from './fields';

/** Symbols get baked into the cell number format so the figures stay real numbers the
 * recipient can sum, rather than strings with a currency glued on. */
const CURRENCY_FORMATS: Record<CurrencyCode, string> = {
  dzd: '#,##0" DA"',
  usd: '"$"#,##0.00',
  eur: '#,##0.00" €"',
};

const BRAND = 'FF00786B'; // the dashboard's --brand-600, in the ARGB Excel wants
const HEADER_TEXT = 'FFFFFFFF';
const BAND = 'FFF4F7F7';

/** How far the title block spans when there are columns enough for it. */
const TITLE_SPAN = 6;

export type ExportArgs = {
  /** The language the sheet is written in — the dashboard's own, at the moment the
   * button was pressed. Everything the file says comes from here; the figures stay raw
   * numbers so the recipient's Excel formats them with their own separators. */
  t: Translate;
  tCount: TranslateCount;
  format: Formatters;
  restaurantName: string;
  range: DateRange;
  orders: OrderWithUser[];
  totals: OrderTotals;
  currency: CurrencyCode | undefined;
  /** True when the range hit the row ceiling — said on the sheet itself, because a
   * spreadsheet outlives the screen that warned about it. */
  truncated: boolean;
  /** The columns picked in the export modal. Their order on the sheet comes from
   * EXPORT_FIELDS, not from this array. */
  fields: readonly ExportFieldKey[];
  /** Dish names for the Products column. */
  dishes: DishCatalogue;
  /** The categories the orders were narrowed to (lib/finance/categories.ts), as the sheet
   * names them — absent for the whole restaurant. `orders` and `totals` must already be
   * the slice. */
  categoryLabel?: string;
};

/**
 * Builds and downloads the orders workbook for the selected range and columns.
 *
 * ExcelJS is imported lazily inside this function: it's around 900KB, only ever runs
 * behind a click, and pulling it into the initial bundle would slow every page in the
 * dashboard to speed up one button.
 */
export async function exportOrdersWorkbook({
  t,
  tCount,
  format,
  restaurantName,
  range,
  orders,
  totals,
  currency,
  truncated,
  fields,
  dishes,
  categoryLabel,
}: ExportArgs): Promise<void> {
  const picked = new Set(fields);
  const columns = EXPORT_FIELDS.filter((field) => picked.has(field.key));
  if (columns.length === 0) throw new Error(t('sheet.noColumns'));

  const imported = await import('exceljs');
  // The browser build is UMD, so depending on the bundler's interop the namespace either
  // is the library or wraps it in `default`. Accept both rather than betting on one.
  const ExcelJS = (imported as unknown as { default?: typeof imported }).default ?? imported;

  const money = currency ? CURRENCY_FORMATS[currency] : '#,##0';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Switch Finance';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(t('sheet.name'), {
    views: [{ state: 'frozen', ySplit: 5 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  sheet.columns = columns.map((field) => ({ key: field.key, width: field.width }));

  // A one-column sheet has nothing to merge across, and ExcelJS rejects a degenerate
  // range, so the title block only spans when there's something to span.
  const titleEnd = columnLetter(Math.min(TITLE_SPAN, columns.length));
  const spanTitle = (rowNumber: number) => {
    if (columns.length > 1) sheet.mergeCells(`A${rowNumber}:${titleEnd}${rowNumber}`);
  };

  // ---- title block ----------------------------------------------------------
  const title = sheet.addRow([restaurantName]);
  title.font = { bold: true, size: 16 };
  spanTitle(1);

  const period = sheet.addRow([
    categoryLabel
      ? t('sheet.subtitleCategories', { categories: categoryLabel, period: format.range(range) })
      : t('sheet.subtitle', { period: format.range(range) }),
  ]);
  period.font = { size: 11, color: { argb: 'FF6B7280' } };
  spanTitle(2);

  if (truncated) {
    const warning = sheet.addRow([t('sheet.truncated')]);
    warning.font = { size: 10, bold: true, color: { argb: 'FFB42318' } };
    spanTitle(3);
  } else {
    sheet.addRow([]);
  }

  // Row 4 is spare on a whole-restaurant sheet. On a category sheet it says how shared
  // orders were counted, since the Price of such an order won't match its receipt.
  if (categoryLabel) {
    const note = sheet.addRow([t('sheet.categoryNote')]);
    note.font = { size: 10, italic: true, color: { argb: 'FF6B7280' } };
    spanTitle(4);
  } else {
    sheet.addRow([]);
  }

  // ---- header ---------------------------------------------------------------
  const header = sheet.addRow(columns.map((field) => t(field.label)));
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_TEXT } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    cell.alignment = { vertical: 'middle' };
  });
  header.height = 22;

  const firstDataRow = header.number + 1;

  // ---- rows -----------------------------------------------------------------
  const context: ExportRowContext = { t, format, dishes, rate: totals.rate };

  for (const order of orders) {
    const row = sheet.addRow(columns.map((field) => field.value(order, context)));

    for (const field of columns) {
      const cell = row.getCell(field.key);
      if (field.kind === 'date') cell.numFmt = 'dd/mm/yyyy';
      else if (field.kind === 'time') cell.numFmt = 'hh:mm';
      else if (field.kind === 'money') cell.numFmt = money;
    }

    if (row.number % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND } };
      });
    }
  }

  const lastDataRow = firstDataRow + orders.length - 1;

  // ---- totals ---------------------------------------------------------------
  // Real SUM() formulas, not pre-computed constants: the recipient of a finance sheet
  // filters and deletes rows, and a hard-coded total silently stops describing what's
  // on screen the moment they do.
  const sumOf = (field: ExportField) => {
    if (orders.length === 0) return 0;
    const letter = columnLetter(columns.indexOf(field) + 1);
    return { formula: `SUBTOTAL(109,${letter}${firstDataRow}:${letter}${lastDataRow})` };
  };

  sheet.addRow([]);
  const totalsRow = sheet.addRow(
    columns.map((field, index) => {
      if (index === 0) return t('sheet.totals');
      if (field.kind === 'money') return sumOf(field);
      if (field.key === 'customer') {
        return tCount('orders.count', orders.length, { count: format.number(orders.length) });
      }
      return '';
    }),
  );
  totalsRow.font = { bold: true };
  totalsRow.eachCell((cell) => {
    cell.border = { top: { style: 'thin', color: { argb: BRAND } } };
  });
  for (const field of columns) {
    if (field.kind === 'money') totalsRow.getCell(field.key).numFmt = money;
  }

  // The only balance that exists: orders are paid to the restaurant as they're taken, so
  // the commission is what it owes Switch, not a deduction from a payout.
  const commissionLabel = t('sheet.commissionOwed');
  // Under the Commission column where it's on the sheet, then Net sales, otherwise under
  // the rightmost money column, so the figure still lands where a reader's eye is already
  // totalling.
  const commissionFieldColumn = columns.findIndex((field) => field.key === 'commission');
  const netColumn = columns.findIndex((field) => field.key === 'net');
  const commissionColumn =
    commissionFieldColumn >= 0
      ? commissionFieldColumn
      : netColumn >= 0
        ? netColumn
        : columns.findLastIndex((field) => field.kind === 'money');

  if (commissionColumn > 0) {
    const commissionRow = sheet.addRow(
      columns.map((_, index) => {
        if (index === 0) return commissionLabel;
        return index === commissionColumn ? totals.commission : '';
      }),
    );
    commissionRow.font = { bold: true };
    commissionRow.getCell(commissionColumn + 1).numFmt = money;
  } else {
    // No money column to hang it under (or it's the first column, where the label sits).
    // The sentence carries the number itself rather than the sheet losing the one figure
    // it exists to state.
    const commissionRow = sheet.addRow([
      t('sheet.commissionOwedValue', { amount: format.money(totals.commission, currency) }),
    ]);
    commissionRow.font = { bold: true };
  }

  if (orders.length > 0) {
    sheet.autoFilter = {
      from: { row: header.number, column: 1 },
      to: { row: lastDataRow, column: columns.length },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const restaurantStem = slug(restaurantName, t('sheet.file.restaurant'));
  const stem = categoryLabel
    ? `${restaurantStem}-${slug(categoryLabel, t('sheet.file.categories'))}`
    : restaurantStem;
  download(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${stem}-${t('sheet.file.orders')}-${range.from}-${t('sheet.file.to')}-${range.to}.xlsx`,
  );
}

/** 1-based column index to its spreadsheet letter (1 → A, 27 → AA). */
function columnLetter(index: number): string {
  let remaining = index;
  let letters = '';
  while (remaining > 0) {
    const offset = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + offset) + letters;
    remaining = (remaining - offset - 1) / 26;
  }
  return letters;
}

/** Latin-safe filename stem. Arabic restaurant names survive fine inside the sheet, but
 * in a filename they get mangled by whatever the recipient's OS does with them — so a
 * name with nothing Latin left in it becomes `fallback`. */
function slug(name: string, fallback: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return cleaned || fallback;
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next tick, not immediately: Safari reads the href asynchronously
  // after the click and hands back an empty file if the URL is already gone.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
