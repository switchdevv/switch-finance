import type { ParseFileJSON, ParseObjectJSON, ParsePointer } from './parse';

/**
 * The `Food` class — one dish on a restaurant's menu. An order points at these through
 * its `food` array, index-aligned with `options.values` (see types/order.ts).
 *
 * `name` feeds the spreadsheet's Products column and `list` the category split (see
 * lib/finance/categories.ts); the rest of the shape is modeled from
 * switch-food/src/screens/OrderDetails/OrderDetails.js:384-415 so a future menu view
 * doesn't have to rediscover it.
 */
export type Food = ParseObjectJSON & {
  name?: string;
  description?: string;
  price?: number;
  picture?: ParseFileJSON;
  restaurant?: ParsePointer<'Restaurant'>;
  /** The menu section the dish sits in — the category an order line is billed under. */
  list?: ParsePointer<'List'>;
};
