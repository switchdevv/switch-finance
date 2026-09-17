import { BUSINESS_TIME_ZONE } from '@/lib/finance/date-range';
import { INTL_LOCALES, type Locale } from '@/lib/i18n/locales';
import type { CurrencyCode } from '@/types/city';
import type { TimeOfDay } from '@/types/restaurant';

/** The symbols the RN apps print these currencies with
 * (switch-manager/src/localization/langs/en.json → `currency`). The same in French. */
const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = { dzd: 'DA', usd: '$', eur: '€' };

export type Formatters = ReturnType<typeof makeFormatters>;

/**
 * Every `Intl` object this app needs, built once per locale — the provider memoises the
 * bundle (lib/i18n/provider.tsx), so a table cell calls a closure instead of constructing
 * a formatter per row.
 *
 * Pinned to the business's timezone (Algiers), not UTC and not the viewer's: these screens
 * report on days of trading, and a timestamp shown in UTC would put a 00:30 order on the
 * previous day, disagreeing with the very totals printed above it. See BUSINESS_TIME_ZONE.
 *
 * Code that runs outside React (the spreadsheet writer) is handed the same bundle, so a
 * file and the screen it was exported from never format a figure two ways.
 */
export function makeFormatters(locale: Locale) {
  const tag = INTL_LOCALES[locale];

  const dateTime = new Intl.DateTimeFormat(tag, {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const dateOnly = new Intl.DateTimeFormat(tag, {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: 'medium',
  });
  const timeOnly = new Intl.DateTimeFormat(tag, {
    timeZone: BUSINESS_TIME_ZONE,
    timeStyle: 'short',
  });
  const number = new Intl.NumberFormat(tag);
  const money = new Intl.NumberFormat(tag, { maximumFractionDigits: 2 });
  const oneDecimal = new Intl.NumberFormat(tag, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  // `style: 'percent'` rather than a '%' glued on: French sets the sign apart with a
  // no-break space ("15 %"), English doesn't ("15%").
  const percent = new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: 2 });

  function dateOf(value: string | Date | undefined | null): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return {
    locale,
    tag,

    /** Full stamp: '10 Sept 2026, 14:32' / '10 sept. 2026, 14:32'. */
    dateTime: (iso: string | undefined | null) => {
      const date = dateOf(iso);
      return date ? dateTime.format(date) : '—';
    },

    /** Date half of dateTime, for two-line table cells that stack date over time. */
    date: (value: string | Date | undefined | null) => {
      const date = dateOf(value);
      return date ? dateOnly.format(date) : '—';
    },

    /** Time half of dateTime. Returns '' (not '—') so a cell can omit the second line
     * entirely rather than stacking a dash under a real date. */
    time: (iso: string | undefined | null) => {
      const date = dateOf(iso);
      return date ? timeOnly.format(date) : '';
    },

    number: (value: number | undefined | null) =>
      value === undefined || value === null ? '—' : number.format(value),

    /** A rating: '4.3' / '4,3'. */
    decimal: (value: number) => oneDecimal.format(value),

    /**
     * Money as the RN apps write it: amount then symbol, e.g. `1,250 DA` / `1 250 DA`. Not
     * `Intl.NumberFormat`'s own currency mode — it renders DZD as "DZD 1,250", which is
     * not what anyone at Switch reads on a receipt.
     *
     * The currency comes from the restaurant's city; when that's missing the amount is
     * shown bare rather than guessed into dinars.
     */
    money: (value: number | undefined | null, currency: CurrencyCode | undefined) => {
      if (value === undefined || value === null || Number.isNaN(value)) return '—';
      const amount = money.format(value);
      const symbol = currency ? CURRENCY_SYMBOLS[currency] : undefined;
      return symbol ? `${amount} ${symbol}` : amount;
    },

    /** A commission rate stored as a fraction (0.15), shown as a percentage (15%). */
    rate: (fee: number | undefined | null) =>
      fee === undefined || fee === null ? '—' : percent.format(Math.round(fee * 10000) / 10000),

    /** A report period: one date for a single day, otherwise 'from – to'. */
    range: ({ start, end, from, to }: { start: Date; end: Date; from: string; to: string }) =>
      from === to
        ? dateOnly.format(start)
        : `${dateOnly.format(start)} – ${dateOnly.format(end)}`,
  };
}

export function formatTimeOfDay(time: TimeOfDay | null | undefined): string {
  if (!time) return '—';
  const h = String(time.h).padStart(2, '0');
  const mn = String(time.mn).padStart(2, '0');
  return `${h}:${mn}`;
}

export function formatOrNone(value: string | undefined | null): string {
  return value && value.length > 0 ? value : '—';
}

/**
 * Phone fields hold one number or several joined by '/' (see the Restaurant rows in
 * switch-manager). Split so a table cell can show the first prominently and the
 * rest as secondary lines instead of one long unreadable run.
 */
export function splitPhones(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(/[/,]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Two-letter fallback for a picture-less avatar. Works on Arabic names too, where
 * the first characters are the meaningful ones just as they are in Latin. */
export function initials(name: string | undefined): string {
  if (!name) return '—';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  if (words.length === 1) return words[0].slice(0, 2);
  return (words[0][0] ?? '') + (words[1][0] ?? '');
}

/** Orders are identified by their objectId; the full 10 characters are noise in a table
 * cell, and the tail is what differs between neighbouring rows. */
export function shortId(objectId: string): string {
  return objectId.slice(-6).toUpperCase();
}
