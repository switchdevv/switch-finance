import { shortId } from '@/lib/format';
import type { Translate } from '@/lib/i18n/dictionary';
import type { DishCatalogue } from '@/lib/services/foods';
import type { Order } from '@/types/order';
import { orderLines, type OrderLineRef } from './order-lines';

/**
 * Splitting a restaurant's orders by category — a section of its menu (`List`), such as
 * the "Crêpes" of a restaurant that runs a crêpe station and is invoiced for it separately.
 *
 * Nothing here computes money. It narrows each order down to the lines in the chosen
 * categories and scales that order's own figures to match, and the result goes through
 * lib/finance/totals.ts like any other set of orders — so the commission rule still lives
 * in exactly one place.
 *
 * A line's category is the menu section its dish is in *now*: orders don't record it, so
 * moving a dish to another section re-files its past sales too.
 */

/** The category of a line whose dish no longer exists or sits in no menu section. It is a
 * real, pickable category so that splitting a restaurant never loses a line. */
export const UNCATEGORISED = 'uncategorised';

/** Menu `List` objectId → section name, for the sections the dishes point at. */
export type MenuNames = Map<string, string>;

export type OrderCategory = {
  id: string;
  name: string;
  /** Billable orders with at least one line in this category. An order that mixes
   * categories counts once under each of them. */
  orderCount: number;
};

type Sliceable = Pick<Order, 'options' | 'food'>;

export function categoryOf(foodId: string, dishes: DishCatalogue): string {
  return dishes.get(foodId)?.menuId ?? UNCATEGORISED;
}

/**
 * Never "deleted": a section that didn't come back may just be unreadable, and a document
 * sent to a restaurant shouldn't guess.
 *
 * `t` is passed in rather than a label being baked here: these names go on invoices, in
 * whichever language the invoice is being printed in. A section's own name is the
 * restaurant's and is never translated.
 */
export function categoryName(id: string, menuNames: MenuNames, t: Translate): string {
  if (id === UNCATEGORISED) return t('categories.uncategorised');
  return menuNames.get(id) ?? t('categories.unnamedMenu', { id: shortId(id) });
}

/** The distinct categories an order's lines fall into. An order with no readable lines at
 * all is filed as uncategorised rather than dropped from every split. */
function categoriesOfOrder(lines: OrderLineRef[], dishes: DishCatalogue): Set<string> {
  if (lines.length === 0) return new Set([UNCATEGORISED]);
  return new Set(lines.map((line) => categoryOf(line.foodId, dishes)));
}

/**
 * The categories present in a set of orders, with how many orders touch each — what the
 * pickers offer. Sections with no sales in the range are left out: picking one would only
 * ever produce an empty export. Sorted by name, uncategorised last.
 */
export function listOrderCategories(
  orders: Sliceable[],
  dishes: DishCatalogue,
  menuNames: MenuNames,
  t: Translate,
): OrderCategory[] {
  const counts = new Map<string, number>();
  for (const order of orders) {
    for (const id of categoriesOfOrder(orderLines(order), dishes)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([id, orderCount]) => ({ id, name: categoryName(id, menuNames, t), orderCount }))
    .sort((a, b) => {
      if (a.id === UNCATEGORISED) return 1;
      if (b.id === UNCATEGORISED) return -1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * The orders as they bill for the selected categories only. No selection means the whole
 * restaurant, and hands back the very same array.
 *
 * - An order with nothing in the selection is dropped.
 * - An order entirely in the selection is kept as it is, so its figures are exact.
 * - An order that mixes categories becomes a copy holding only the selected lines, with
 *   `itemsTotal`, `discount`, `delivery`, `service` and `total` each scaled by the share of
 *   the order's line totals those lines represent. A discount is taken on the whole
 *   basket, so it's shared out the same way; the fees are too, so that exporting every
 *   category separately adds back up to the whole restaurant. Each figure is rounded to a
 *   whole unit, which is the one place the parts can differ from the whole — by at most
 *   a unit per shared order.
 *
 * Orders written before lines carried prices are shared out by quantity instead.
 */
export function sliceOrders<T extends Sliceable>(
  orders: T[],
  dishes: DishCatalogue,
  selected: readonly string[],
): T[] {
  if (selected.length === 0) return orders;
  const picked = new Set(selected);
  const sliced: T[] = [];

  for (const order of orders) {
    const lines = orderLines(order);
    if (lines.length === 0) {
      if (picked.has(UNCATEGORISED)) sliced.push(order);
      continue;
    }

    const kept = lines.filter((line) => picked.has(categoryOf(line.foodId, dishes)));
    if (kept.length === 0) continue;
    if (kept.length === lines.length) {
      sliced.push(order);
      continue;
    }

    sliced.push(narrowOrder(order, lines, kept));
  }

  return sliced;
}

function narrowOrder<T extends Sliceable>(
  order: T,
  lines: OrderLineRef[],
  kept: OrderLineRef[],
): T {
  const share = lineShare(lines, kept);
  const scale = (value: number | undefined) =>
    value === undefined ? undefined : Math.round(value * share);

  const options = order.options ?? {};
  const itemsTotal = scale(options.itemsTotal);
  const discount = scale(options.discount);
  const delivery = scale(options.delivery);
  const service = scale(options.service);
  const keptIndexes = new Set(kept.map((line) => line.index));

  return {
    ...order,
    food: order.food?.filter((_, index) => keptIndexes.has(index)),
    options: {
      ...options,
      itemsTotal,
      discount,
      delivery,
      service,
      // Rebuilt from the scaled parts rather than scaled itself, so the checkout identity
      // (total = itemsTotal − discount + service + delivery) still holds on the copy.
      total:
        options.total === undefined
          ? undefined
          : (itemsTotal ?? 0) -
            (discount ?? 0) +
            (service ?? 0) +
            (options.freeDelivery ? 0 : (delivery ?? 0)),
      values: options.values?.filter((_, index) => keptIndexes.has(index)),
    },
  };
}

/** The fraction of an order the kept lines stand for: by line total where the order has
 * them, by quantity where it doesn't. */
function lineShare(lines: OrderLineRef[], kept: OrderLineRef[]): number {
  const sum = (group: OrderLineRef[], read: (line: OrderLineRef) => number) =>
    group.reduce((total, line) => total + read(line), 0);

  const priced = sum(lines, (line) => line.price ?? 0);
  if (priced > 0) return sum(kept, (line) => line.price ?? 0) / priced;

  const quantity = sum(lines, (line) => line.quantity);
  return quantity > 0 ? sum(kept, (line) => line.quantity) / quantity : 0;
}

/** "Crêpes, Galettes" — the selection as a document names it, in picker order. */
export function categoryLabel(
  ids: readonly string[],
  menuNames: MenuNames,
  t: Translate,
): string {
  return ids
    .map((id) => ({ id, name: categoryName(id, menuNames, t) }))
    .sort((a, b) => {
      if (a.id === UNCATEGORISED) return 1;
      if (b.id === UNCATEGORISED) return -1;
      return a.name.localeCompare(b.name);
    })
    .map((category) => category.name)
    .join(', ');
}

/**
 * A short, stable code for a selection (FNV-1a over the sorted ids), so a category invoice
 * gets a number of its own that is still the same every time the same period and
 * categories are printed.
 */
export function categoryCode(ids: readonly string[]): string {
  return fingerprint([...ids].sort().join(','));
}

/** FNV-1a, 32-bit, in base 36 — a document-number sized digest, not a security one. */
function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).toUpperCase();
}
