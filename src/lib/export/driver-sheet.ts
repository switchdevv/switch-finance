import { hasCarryOver, type CarryOver } from '@/lib/finance/carry-over';
import { daysIn, businessDay, type DateRange } from '@/lib/finance/date-range';
import { byDay, type DriverSettlement, type SettlementDue } from '@/lib/finance/driver-settlement';
import type { Row } from 'exceljs';
import type { Formatters } from '@/lib/format';
import type { Translate, TranslateCount } from '@/lib/i18n/dictionary';
import type { CurrencyCode } from '@/types/city';
import type { DriverOrder } from '@/types/order';
import { DRIVER_FIELDS, type DriverField, type DriverFieldKey } from './driver-fields';
import {
  BAND,
  BRAND,
  columnLetter,
  DANGER,
  downloadWorkbook,
  HEADER_TEXT,
  loadExcel,
  moneyFormat,
  MUTED,
  slug,
} from './workbook';

const TITLE_SPAN = 6;

export type DriverExportArgs = {
  t: Translate;
  tCount: TranslateCount;
  format: Formatters;
  driverName: string;
  range: DateRange;
  /** The delivered orders — the ones the settlement counts. */
  orders: DriverOrder[];
  settlement: DriverSettlement;
  due: SettlementDue;
  walletStartsAt: string | null;
  currency: CurrencyCode | undefined;
  truncated: boolean;
  fields: readonly DriverFieldKey[];
  carryOver: CarryOver;
};

/**
 * A driver's settlement for a period as a workbook: one sheet of the delivered orders with
 * their per-order balance and real SUBTOTAL() totals, what is due underneath, and a second
 * sheet with the same period day by day. Written in the dashboard's language, like the
 * restaurant sheet (excel.ts), whose look it shares.
 */
export async function exportDriverWorkbook({
  t,
  tCount,
  format,
  driverName,
  range,
  orders,
  settlement,
  due,
  walletStartsAt,
  currency,
  truncated,
  fields,
  carryOver,
}: DriverExportArgs): Promise<void> {
  const picked = new Set(fields);
  const columns = DRIVER_FIELDS.filter((field) => picked.has(field.key));
  if (columns.length === 0) throw new Error(t('sheet.noColumns'));

  const ExcelJS = await loadExcel();
  const money = moneyFormat(currency);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Switch Finance';
  workbook.created = new Date();

  // ---- orders ---------------------------------------------------------------
  const sheet = workbook.addWorksheet(t('driverSheet.name'), {
    views: [{ state: 'frozen', ySplit: 5 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = columns.map((field) => ({ key: field.key, width: field.width }));

  const titleEnd = columnLetter(Math.min(TITLE_SPAN, columns.length));
  const spanTitle = (rowNumber: number) => {
    if (columns.length > 1) sheet.mergeCells(`A${rowNumber}:${titleEnd}${rowNumber}`);
  };

  const title = sheet.addRow([driverName]);
  title.font = { bold: true, size: 16 };
  spanTitle(1);

  const period = sheet.addRow([t('driverSheet.subtitle', { period: format.range(range) })]);
  period.font = { size: 11, color: { argb: MUTED } };
  spanTitle(2);

  if (truncated) {
    const warning = sheet.addRow([t('sheet.truncated')]);
    warning.font = { size: 10, bold: true, color: { argb: DANGER } };
  } else {
    sheet.addRow([]);
  }
  spanTitle(3);

  const overview = sheet.addRow([
    t('driverSheet.overview', {
      deliveries: tCount('driverFinance.deliveries', settlement.delivered, {
        count: format.number(settlement.delivered),
      }),
      cash: format.number(settlement.cash),
      card: format.number(settlement.card),
      earnings: format.money(settlement.earnings, currency),
    }),
  ]);
  overview.font = { size: 10, italic: true, color: { argb: MUTED } };
  spanTitle(4);

  const header = sheet.addRow(columns.map((field) => t(field.label)));
  styleHeader(header);

  const firstDataRow = header.number + 1;
  const context = { t, format, walletStartsAt };

  for (const order of orders) {
    const row = sheet.addRow(columns.map((field) => field.value(order, context)));
    for (const field of columns) {
      const cell = row.getCell(field.key);
      if (field.kind === 'date') cell.numFmt = 'dd/mm/yyyy';
      else if (field.kind === 'time') cell.numFmt = 'hh:mm';
      else if (field.kind === 'money') cell.numFmt = money;
    }
    if (row.number % 2 === 0) band(row);
  }

  const lastDataRow = firstDataRow + orders.length - 1;
  const sumOf = (field: DriverField) => {
    if (orders.length === 0) return 0;
    const letter = columnLetter(columns.indexOf(field) + 1);
    return { formula: `SUBTOTAL(109,${letter}${firstDataRow}:${letter}${lastDataRow})` };
  };

  sheet.addRow([]);
  const totalsRow = sheet.addRow(
    columns.map((field, index) => {
      if (index === 0) return t('sheet.totals');
      if (field.kind === 'money') return sumOf(field);
      if (field.key === 'restaurant') {
        return tCount('driverFinance.deliveries', orders.length, {
          count: format.number(orders.length),
        });
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

  // ---- what is due ----------------------------------------------------------
  // Under the Balance column where it's on the sheet, else under the rightmost money column;
  // with no money column at all, the label carries the figure.
  const balanceIndex = columns.findIndex((field) => field.key === 'balance');
  const amountColumn =
    balanceIndex >= 0 ? balanceIndex : columns.findLastIndex((field) => field.kind === 'money');

  const addLine = (label: string, amount: number, isTotal = false) => {
    const row =
      amountColumn > 0
        ? sheet.addRow(columns.map((_, index) => (index === 0 ? label : index === amountColumn ? amount : '')))
        : sheet.addRow([t('sheet.labelledValue', { label, amount: format.money(amount, currency) })]);
    row.font = { bold: true };
    if (amountColumn > 0) row.getCell(amountColumn + 1).numFmt = money;
    if (isTotal) {
      row.eachCell((cell) => {
        cell.border = { top: { style: 'thin', color: { argb: BRAND } } };
      });
    }
  };

  const hasWalletLine = !!walletStartsAt && due.prepaid !== 0;
  const carried = hasCarryOver(carryOver);

  addLine(t('driverSheet.lines.net'), due.net);
  if (hasWalletLine) addLine(t('driverSheet.lines.prepaid'), -due.prepaid);
  if (carried) {
    addLine(
      carryOver.note
        ? t('sheet.previousBalanceNoted', { note: carryOver.note })
        : t('sheet.previousBalance'),
      carryOver.amount,
    );
  }
  if (hasWalletLine || carried) {
    addLine(
      due.due >= 0 ? t('driverSheet.lines.dueFromDriver') : t('driverSheet.lines.dueToDriver'),
      Math.abs(due.due),
      true,
    );
  }

  const legend = sheet.addRow([t('driverSheet.legend')]);
  legend.font = { size: 10, italic: true, color: { argb: MUTED } };
  spanTitle(legend.number);

  if (orders.length > 0) {
    sheet.autoFilter = {
      from: { row: header.number, column: 1 },
      to: { row: lastDataRow, column: columns.length },
    };
  }

  // ---- by day ---------------------------------------------------------------
  const daily = workbook.addWorksheet(t('driverSheet.dailyName'), {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  daily.columns = [
    { key: 'day', width: 14 },
    { key: 'delivered', width: 14 },
    { key: 'earnings', width: 16 },
    { key: 'net', width: 16 },
  ];
  styleHeader(
    daily.addRow([
      t('sheet.fields.date'),
      t('driverSheet.daily.deliveries'),
      t('driverSheet.daily.earnings'),
      t('driverSheet.fields.balance'),
    ]),
  );
  const days = byDay(orders, daysIn(range), businessDay);
  for (const day of days) {
    const row = daily.addRow([new Date(`${day.day}T12:00:00`), day.delivered, day.earnings, day.net]);
    row.getCell('day').numFmt = 'dd/mm/yyyy';
    row.getCell('earnings').numFmt = money;
    row.getCell('net').numFmt = money;
    if (row.number % 2 === 0) band(row);
  }
  if (days.length > 0) {
    const last = days.length + 1;
    const totals = daily.addRow([
      t('sheet.totals'),
      { formula: `SUM(B2:B${last})` },
      { formula: `SUM(C2:C${last})` },
      { formula: `SUM(D2:D${last})` },
    ]);
    totals.font = { bold: true };
    totals.getCell('earnings').numFmt = money;
    totals.getCell('net').numFmt = money;
    totals.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: BRAND } } };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadWorkbook(
    buffer,
    `${slug(driverName, t('driverSheet.file.driver'))}-${t('driverSheet.file.settlement')}-${range.from}-${t('sheet.file.to')}-${range.to}.xlsx`,
  );
}

function styleHeader(header: Row) {
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_TEXT } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    cell.alignment = { vertical: 'middle' };
  });
  header.height = 22;
}

function band(row: Row) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND } };
  });
}
