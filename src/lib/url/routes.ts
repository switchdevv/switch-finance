/**
 * The routes that address a single restaurant or driver.
 *
 * They carry the objectId as `?id=` rather than as a path segment because the app is
 * exported to static files (see next.config.ts): a `[objectId]` segment would have to be
 * enumerated at build time, and the ids only exist in Parse, which is browser-only. The
 * builders and the reader live together here so the two sides can't drift apart.
 */

import {
  MODE_PARAM,
  writeStatementOptions,
  type StatementMode,
  type StatementOptions,
} from '@/lib/invoice/driver-statement';
import { writeInvoiceOptions, type InvoiceOptions } from '@/lib/invoice/options';

export const RESTAURANTS_HREF = '/restaurants';
const DETAIL_PATH = '/restaurants/detail';
const INVOICE_PATH = '/restaurants/invoice';

type ReadableParams = Pick<URLSearchParams, 'get'>;

/** The restaurant the current URL is about, or '' when the link was malformed. Callers
 * render their own "not found" for the empty case rather than fetching with it. */
export function readRestaurantId(params: ReadableParams): string {
  return params.get('id')?.trim() ?? '';
}

/** `backHref` is the directory exactly as the user left it — page and every filter —
 * rather than a bare page number, so returning from a restaurant doesn't silently drop
 * the search that found it. */
export function restaurantDetailHref(objectId: string, backHref?: string): string {
  const params = new URLSearchParams({ id: objectId });
  if (backHref) params.set('back', backHref);
  return `${DETAIL_PATH}?${params.toString()}`;
}

export function restaurantInvoiceHref(
  objectId: string,
  range: { from: string; to: string },
  /** What the print dialog chose. Omitted — from a link that just wants the document —
   * the invoice prints the whole restaurant with its usual columns and nothing carried
   * over. */
  options?: InvoiceOptions,
): string {
  const params = new URLSearchParams({ id: objectId, from: range.from, to: range.to });
  if (options) writeInvoiceOptions(params, options);
  return `${INVOICE_PATH}?${params.toString()}`;
}

export const DRIVERS_HREF = '/drivers';
const DRIVER_DETAIL_PATH = '/drivers/detail';
const DRIVER_STATEMENT_PATH = '/drivers/statement';
/** Admin-only: the wallet rules, global and per region. */
export const WALLET_SETTINGS_HREF = '/drivers/settings';

/** The two halves of a driver's page. Finance is the default and stays out of the URL. */
export type DriverTab = 'finance' | 'wallet';
export const DRIVER_TABS: readonly DriverTab[] = ['finance', 'wallet'];

export function readDriverTab(params: ReadableParams): DriverTab {
  return params.get('tab') === 'wallet' ? 'wallet' : 'finance';
}

/** The driver the current URL is about, or '' when the link was malformed. */
export function readDriverId(params: ReadableParams): string {
  return params.get('id')?.trim() ?? '';
}

/** Like `restaurantDetailHref`: `backHref` is the drivers list exactly as it was left. */
export function driverDetailHref(objectId: string, backHref?: string, tab?: DriverTab): string {
  const params = new URLSearchParams({ id: objectId });
  if (tab === 'wallet') params.set('tab', tab);
  if (backHref) params.set('back', backHref);
  return `${DRIVER_DETAIL_PATH}?${params.toString()}`;
}

/** A driver's printable statement for a period — see lib/invoice/driver-statement.ts. */
export function driverStatementHref(
  objectId: string,
  range: { from: string; to: string },
  mode: StatementMode,
  options?: StatementOptions,
): string {
  const params = new URLSearchParams({ id: objectId, from: range.from, to: range.to });
  if (mode !== 'settlement') params.set(MODE_PARAM, mode);
  if (options) writeStatementOptions(params, options);
  return `${DRIVER_STATEMENT_PATH}?${params.toString()}`;
}
