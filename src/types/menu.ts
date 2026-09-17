import type { ParseObjectJSON, ParsePointer } from './parse';

/**
 * The `List` class — one section of a restaurant's menu ("Crêpes", "Drinks"). This is
 * what finance calls a category: a dish belongs to exactly one through `Food.list`, so a
 * restaurant's orders can be split and invoiced per section (see lib/finance/categories.ts).
 *
 * Not to be confused with the `Category` class on Restaurant.categories, which files a
 * whole restaurant under a cuisine and says nothing about individual dishes.
 */
export type Menu = ParseObjectJSON & {
  name?: string;
  restaurant?: ParsePointer<'Restaurant'>;
};
