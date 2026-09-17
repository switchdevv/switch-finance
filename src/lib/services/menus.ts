import { find } from '@/lib/parse/query';
import type { Menu } from '@/types/menu';

const COLLECTION = 'List';

/** Same reasoning as the dish lookup in lib/services/foods: `containedIn` is sent as a
 * literal array, so ids go in batches. */
const ID_BATCH_SIZE = 200;

/**
 * Menu sections (`List`) by objectId, for naming the categories a restaurant's orders are
 * split into.
 *
 * By id — the sections the dishes actually point at — rather than by restaurant: a dish
 * copied in from another restaurant can still point at that restaurant's section, and a
 * section switched off or since emptied still sold dishes in the period being invoiced.
 * Rows are created world-readable (switch-ops/src/lib/services/menus.ts); one that doesn't
 * come back is named by id by the caller.
 */
export async function fetchMenus(ids: string[]): Promise<Menu[]> {
  const unique = [...new Set(ids)];
  const menus: Menu[] = [];

  for (let start = 0; start < unique.length; start += ID_BATCH_SIZE) {
    const batch = unique.slice(start, start + ID_BATCH_SIZE);
    menus.push(
      ...(await find<Menu>(COLLECTION, [
        { containedIn: { key: 'objectId', value: batch } },
        { select: ['name'] },
        { limit: batch.length },
      ])),
    );
  }

  return menus;
}
