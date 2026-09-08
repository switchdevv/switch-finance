import { BUSINESS_TIME_ZONE } from '@/lib/finance/date-range';
import type { CurrencyCode } from '@/types/city';
import type { TimeOfDay } from '@/types/restaurant';

// Pinned to a fixed locale/timezone rather than the environment's own — a locale or
// timezone that differs between server render and browser is a classic hydration
// mismatch, and pinning it costs nothing since this dashboard has one audience.
//
// That fixed zone is the business's (Algiers), not UTC: these screens report on days of
// trading, and a timestamp shown in UTC would put a 00:30 order on the previous day,
// disagreeing with the very totals printed above it. See BUSINESS_TIME_ZONE.
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
});

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  dateStyle: 'medium',
});

const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  timeStyle: 'short',
});

const NUMBER_FORMAT = new Intl.NumberFormat('en-GB');

const MONEY_FORMAT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });

/** The symbols the RN apps print these currencies with
 * (switch-manager/src/localization/langs/en.json → `currency`). */
const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = { dzd: 'DA', usd: '$', eur: '€' };

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return DATE_TIME_FORMAT.format(date);
}

export function formatTimeOfDay(time: TimeOfDay | null | undefined): string {
  if (!time) return '—';
  const h = String(time.h).padStart(2, '0');
  const mn = String(time.mn).padStart(2, '0');
  return `${h}:${mn}`;
}

/** Day numbers as stored on `workingDays` (0-6). Labeled Sunday-first per JS's own
 * Date#getDay() convention — unverified against the RN apps' own day labels, see
 * the note on Restaurant['workingDays']. */
export function formatWorkingDays(days: number[] | undefined): string {
  if (!days || days.length === 0) return '—';
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => DAY_LABELS[day] ?? '?')
    .join(', ');
}

export function formatNumber(value: number | undefined): string {
  if (value === undefined) return '—';
  return NUMBER_FORMAT.format(value);
}

export function formatOrNone(value: string | undefined | null): string {
  return value && value.length > 0 ? value : '—';
}

/** Date half of formatDateTime, for two-line table cells that stack date over time. */
export function formatDate(iso: string | undefined): string {
  const date = toDate(iso);
  return date ? DATE_FORMAT.format(date) : '—';
}

/** Time half of formatDateTime. Returns '' (not '—') so a cell can omit the second
 * line entirely rather than stacking a dash under a real date. */
export function formatTime(iso: string | undefined): string {
  const date = toDate(iso);
  return date ? TIME_FORMAT.format(date) : '';
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

function toDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Money as the RN apps write it: amount then symbol, e.g. `1,250 DA`. Not
 * `Intl.NumberFormat`'s own currency mode — it renders DZD as "DZD 1,250", which is not
 * what anyone at Switch reads on a receipt.
 *
 * The currency comes from the restaurant's city; when that's missing the amount is shown
 * bare rather than guessed into dinars.
 */
export function formatMoney(value: number | undefined, currency: CurrencyCode | undefined): string {
  if (value === undefined || Number.isNaN(value)) return '—';
  const amount = MONEY_FORMAT.format(value);
  const symbol = currency ? CURRENCY_SYMBOLS[currency] : undefined;
  return symbol ? `${amount} ${symbol}` : amount;
}

/** A commission rate stored as a fraction (0.15), shown as a percentage (15%). */
export function formatRate(fee: number | undefined): string {
  if (fee === undefined) return '—';
  return `${NUMBER_FORMAT.format(Math.round(fee * 10000) / 100)}%`;
}

/** Orders are identified by their objectId; the full 10 characters are noise in a table
 * cell, and the tail is what differs between neighbouring rows. */
export function shortId(objectId: string): string {
  return objectId.slice(-6).toUpperCase();
}
