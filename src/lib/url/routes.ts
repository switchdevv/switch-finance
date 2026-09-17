/**
 * The two routes that address a single restaurant.
 *
 * They carry the objectId as `?id=` rather than as a path segment because the app is
 * exported to static files (see next.config.ts): a `[objectId]` segment would have to be
 * enumerated at build time, and the ids only exist in Parse, which is browser-only. The
 * builders and the reader live together here so the two sides can't drift apart.
 */

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
): string {
  const params = new URLSearchParams({ id: objectId, from: range.from, to: range.to });
  return `${INVOICE_PATH}?${params.toString()}`;
}

/** The invoice's menu-section filter (lib/finance/categories.ts), comma-separated ids —
 * absent for the whole restaurant. The invoice page writes it from its own picker. */
export const CATEGORIES_PARAM = 'categories';

/** The categories an invoice link is narrowed to, deduplicated; empty for the whole
 * restaurant. */
export function readCategoryIds(params: ReadableParams): string[] {
  const raw = params.get(CATEGORIES_PARAM) ?? '';
  return [...new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))];
}
