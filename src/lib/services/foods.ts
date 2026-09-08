import { find } from '@/lib/parse/query';
import type { Food } from '@/types/food';

const COLLECTION = 'Food';

/** `containedIn` goes to the server as a literal array and the rows come back subject to
 * Parse's own page ceiling, so ids are asked for in batches rather than one huge query. */
const ID_BATCH_SIZE = 200;

/**
 * Dish names for a set of Food objectIds, keyed by id.
 *
 * Deliberately not an `include: 'food'` on the orders query: that attaches a whole Food
 * row to every line of every order in the range — the same few dozen dishes repeated
 * thousands of times — and it would weigh down the range fetch that the tiles and the
 * invoice share, to serve a column only the spreadsheet has.
 *
 * A dish deleted since the order was placed simply doesn't come back; callers render
 * those lines by id rather than dropping the line.
 */
export async function fetchProductNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  const names = new Map<string, string>();

  for (let start = 0; start < unique.length; start += ID_BATCH_SIZE) {
    const batch = unique.slice(start, start + ID_BATCH_SIZE);
    const rows = await find<Food>(COLLECTION, [
      { containedIn: { key: 'objectId', value: batch } },
      // Safe here in a way it isn't on the orders query: there's no `include` for it to
      // interact with, and objectId comes back whatever the projection says.
      { select: ['name'] },
      { limit: batch.length },
    ]);

    for (const row of rows) {
      if (row.name) names.set(row.objectId, row.name);
    }
  }

  return names;
}
