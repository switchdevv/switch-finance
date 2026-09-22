/**
 * What the restaurant still owed before the period a document covers — typed by hand on
 * the print or export dialog, because nothing in Parse records what has actually been
 * collected (see lib/finance/totals.ts: orders are settled as they are taken, so the only
 * balance that ever exists is commission).
 *
 * It is deliberately not part of OrderTotals. It is not order money: it never enters the
 * commission base, is never rated, and is simply added to what this period comes to so
 * the restaurant reads one figure instead of two.
 */
export type CarryOver = {
  /** In the restaurant's own currency, whole units. Zero means nothing is outstanding. */
  amount: number;
  /** What it is for — 'August 2026', 'invoice SW-…'. Optional: an amount alone prints. */
  note: string;
};

export const NO_CARRY_OVER: CarryOver = { amount: 0, note: '' };

/**
 * Whether anything reaches paper. A zero is someone who opened the field and left it
 * alone, not a line the restaurant needs to read — and a negative one would be a credit
 * this app has no way to justify, so it is treated the same way.
 */
export function hasCarryOver(carryOver: CarryOver | undefined): boolean {
  return carryOver !== undefined && carryOver.amount > 0;
}

/** This period's commission plus anything left over from before it. */
export function totalDue(commission: number, carryOver: CarryOver | undefined): number {
  return commission + (hasCarryOver(carryOver) ? (carryOver?.amount ?? 0) : 0);
}
