import {
  CalendarDate,
  endOfMonth,
  endOfWeek,
  endOfYear,
  parseDate,
  startOfMonth,
  startOfWeek,
  startOfYear,
  today,
} from '@internationalized/date';

/**
 * Day boundaries for every report are Algiers days, not UTC ones and not the viewer's.
 *
 * Worth knowing when reconciling against the merchant app: switch-manager's Summary
 * screen (src/screens/Summary/Summary.js:54-58) takes local midnight and subtracts the
 * device's UTC offset, which lands it on UTC boundaries. So a day's totals here can
 * differ from that screen's by whatever was ordered between 23:00 and 00:00 UTC. This
 * constant is the single place to change if matching that behaviour ever matters more
 * than being correct about when a business day starts.
 */
export const BUSINESS_TIME_ZONE = 'Africa/Algiers';

/** Week starts Monday — a business rule, not a display one, so it stays put whichever
 * language the dashboard is read in (en-GB and fr-FR agree on it anyway). */
const WEEK_LOCALE = 'en-GB';

export type RangePreset = 'today' | 'week' | 'month' | 'year' | 'custom';

/** In picker order. Their names are the dictionary's (`range.presets.*`). */
export const RANGE_PRESETS: readonly RangePreset[] = ['today', 'week', 'month', 'year', 'custom'];

export type DateRange = {
  preset: RangePreset;
  /** Inclusive first instant of the first day, in Algiers time. */
  start: Date;
  /** Inclusive last instant of the last day (23:59:59.999 Algiers). */
  end: Date;
  /** ISO calendar dates (YYYY-MM-DD) — what goes in the URL and in filenames. The
   * human-readable period is `format.range(range)`, in the reader's language. */
  from: string;
  to: string;
};

/** Parses a YYYY-MM-DD string, returning null rather than throwing on junk from the URL. */
export function parseCalendarDate(value: string | null | undefined): CalendarDate | null {
  if (!value) return null;
  try {
    const parsed = parseDate(value);
    return new CalendarDate(parsed.year, parsed.month, parsed.day);
  } catch {
    return null;
  }
}

function presetBounds(preset: Exclude<RangePreset, 'custom'>): [CalendarDate, CalendarDate] {
  const now = today(BUSINESS_TIME_ZONE);

  switch (preset) {
    case 'week':
      return [startOfWeek(now, WEEK_LOCALE), endOfWeek(now, WEEK_LOCALE)];
    case 'month':
      return [startOfMonth(now), endOfMonth(now)];
    case 'year':
      return [startOfYear(now), endOfYear(now)];
    default:
      return [now, now];
  }
}

/**
 * Resolves a preset (or a custom pair) into the concrete instants a Parse `createdAt`
 * filter needs.
 *
 * The end of a period is clamped to today: a report for "this month" on the 8th covers
 * the 1st to the 8th, not to the 30th. No orders exist in the future either way, so this
 * changes no total — it only stops the header from claiming a period that hasn't
 * happened yet.
 */
export function resolveRange(
  preset: RangePreset,
  from?: string | null,
  to?: string | null,
): DateRange {
  const now = today(BUSINESS_TIME_ZONE);

  let startDate: CalendarDate;
  let endDate: CalendarDate;

  if (preset === 'custom') {
    const parsedFrom = parseCalendarDate(from);
    const parsedTo = parseCalendarDate(to);
    startDate = parsedFrom ?? now;
    endDate = parsedTo ?? startDate;
    // A range typed backwards is a slip, not a request for zero rows.
    if (endDate.compare(startDate) < 0) [startDate, endDate] = [endDate, startDate];
  } else {
    [startDate, endDate] = presetBounds(preset);
    if (endDate.compare(now) > 0) endDate = now;
  }

  const start = startDate.toDate(BUSINESS_TIME_ZONE);
  // Midnight at the start of the day *after* the last one, minus a millisecond — the
  // only way to get an inclusive upper bound that survives DST and leap seconds without
  // hand-rolling 23:59:59.999.
  const end = new Date(endDate.add({ days: 1 }).toDate(BUSINESS_TIME_ZONE).getTime() - 1);

  return {
    preset,
    start,
    end,
    from: startDate.toString(),
    to: endDate.toString(),
  };
}

/** Narrows an arbitrary `?range=` value to a preset, defaulting to today. */
export function parsePreset(raw: string | null | undefined): RangePreset {
  return (RANGE_PRESETS as readonly string[]).includes(raw ?? '') ? (raw as RangePreset) : 'today';
}
