import { find } from '@/lib/parse/query';
import type { Food } from '@/types/food';

const COLLECTION = 'Food';

/** `containedIn` goes to the server as a literal array and the rows come back subject to
 * Parse's own page ceiling, so ids are asked for in batches rather than one huge query. */
const ID_BATCH_SIZE = 200;

/** What an order line needs to know about its dish: the name the Products column prints,
 * and the menu section (`List`) the category split bills it under. */
export type Dish = { name?: string; menuId?: string };

/** Food objectId → Dish. A dish missing from the map no longer exists. */
export type DishCatalogue = Map<string, Dish>;

/**
 * Name and menu section for a set of Food objectIds, keyed by id.
 *
 * Deliberately not an `include: 'food'` on the orders query: that attaches a whole Food
 * row to every line of every order in the range — the same few dozen dishes repeated
 * thousands of times — and it would weigh down the range fetch that the tiles and the
 * invoice share, to serve lookups only the exports need.
 *
 * A dish deleted since the order was placed simply doesn't come back; callers render
 * those lines by id and bill them as uncategorised rather than dropping the line.
 */
export async function fetchDishes(ids: string[]): Promise<DishCatalogue> {
  const unique = [...new Set(ids)];
  const dishes: DishCatalogue = new Map();

  for (let start = 0; start < unique.length; start += ID_BATCH_SIZE) {
    const batch = unique.slice(start, start + ID_BATCH_SIZE);
    const rows = await find<Food>(COLLECTION, [
      { containedIn: { key: 'objectId', value: batch } },
      // Safe here in a way it isn't on the orders query: there's no `include` for it to
      // interact with, and objectId comes back whatever the projection says. `list` comes
      // back as a bare pointer, which is all the split needs.
      { select: ['name', 'list'] },
      { limit: batch.length },
    ]);

    for (const row of rows) {
      dishes.set(row.objectId, { name: row.name || undefined, menuId: row.list?.objectId });
    }
  }

  return dishes;
}
