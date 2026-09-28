import type { CurrencyCode } from '@/types/city';

/**
 * What every workbook this app writes shares — the restaurant orders sheet (excel.ts) and a
 * driver's settlement sheet (driver-sheet.ts) — so the two files look like one product.
 */

/** Symbols get baked into the cell number format so the figures stay real numbers the
 * recipient can sum, rather than strings with a currency glued on. */
export const CURRENCY_FORMATS: Record<CurrencyCode, string> = {
  dzd: '#,##0" DA"',
  usd: '"$"#,##0.00',
  eur: '#,##0.00" €"',
};

export function moneyFormat(currency: CurrencyCode | undefined): string {
  return currency ? CURRENCY_FORMATS[currency] : '#,##0';
}

export const BRAND = 'FF00786B'; // the dashboard's --brand-600, in the ARGB Excel wants
export const HEADER_TEXT = 'FFFFFFFF';
export const BAND = 'FFF4F7F7';
export const MUTED = 'FF6B7280';
export const DANGER = 'FFB42318';

/**
 * ExcelJS, imported on demand: it's around 900KB, only ever runs behind a click, and pulling
 * it into the initial bundle would slow every page in the dashboard to speed up one button.
 */
export async function loadExcel() {
  const imported = await import('exceljs');
  // The browser build is UMD, so depending on the bundler's interop the namespace either
  // is the library or wraps it in `default`. Accept both rather than betting on one.
  return (imported as unknown as { default?: typeof imported }).default ?? imported;
}

/** 1-based column index to its spreadsheet letter (1 → A, 27 → AA). */
export function columnLetter(index: number): string {
  let remaining = index;
  let letters = '';
  while (remaining > 0) {
    const offset = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + offset) + letters;
    remaining = (remaining - offset - 1) / 26;
  }
  return letters;
}

/** Latin-safe filename stem. Arabic names survive fine inside the sheet, but in a filename
 * they get mangled by whatever the recipient's OS does with them — so a name with nothing
 * Latin left in it becomes `fallback`. */
export function slug(name: string, fallback: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return cleaned || fallback;
}

export function downloadWorkbook(buffer: ArrayBuffer, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
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
