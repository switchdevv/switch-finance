import type { City } from './city';
import type { ParseFileJSON, ParseGeoPointJSON, ParseObjectJSON, ParsePointer } from './parse';

export type TimeOfDay = { h: number; mn: number };

/**
 * The `Restaurant` class, fields verbatim from switch-manager's Store editor
 * (src/screens/Store/Store.js) and switch-food's consumer-facing screens. Every
 * field but the base ParseObjectJSON ones is optional on purpose — see the note on
 * ParseObjectJSON. `city`/`categories` are typed as unincluded pointers here; the
 * detail fetch resolves them via `include` (see RestaurantWithRelations below).
 */
export type Restaurant = ParseObjectJSON & {
  name?: string;
  searchName?: string;
  description?: string;
  address?: string;
  phone?: string;

  /** Manager's own pause/resume toggle. Distinct from `enabled` — see StatusChip. */
  active?: boolean;
  /** Admin/platform approval. Distinct from `active` — see StatusChip. */
  enabled?: boolean;

  openTime?: TimeOfDay;
  closeTime?: TimeOfDay;
  pauseStart?: TimeOfDay | null;
  pauseEnd?: TimeOfDay | null;
  /** 0-6. Origin (Sunday-first vs Monday-first) is unverified against the RN apps'
   * day labels — confirm before trusting rendered hours in a locale-sensitive UI. */
  workingDays?: number[];

  location?: ParseGeoPointJSON;
  picture?: ParseFileJSON;

  rating?: number;
  reviews?: number;
  /**
   * Commission rate as a fraction — 0.15 means Switch takes 15%. Verified against
   * switch-manager/src/screens/Summary/Summary.js:62,91, which computes the platform's
   * cut as `parseInt(ordersTotal * fee)` where `ordersTotal` is the food subtotal net of
   * discounts. There is no historical snapshot of this rate on the orders themselves, so
   * changing it re-prices every past period (see lib/finance/totals.ts).
   */
  fee?: number;
  ordersTotal?: number;

  isFeatured?: boolean;
  isDiscount?: boolean;
  isPromo?: boolean;

  categories?: ParsePointer<'Category'>[];
  city?: ParsePointer<'City'>;
};

/**
 * The shape returned once `city` and `categories` are `include`d — Parse resolves
 * an included pointer to a full nested object rather than leaving it as the
 * `{__type: 'Pointer', ...}` stub, so this can't just reuse Restaurant's field
 * types as-is.
 */
export type RestaurantWithRelations = Omit<Restaurant, 'city' | 'categories'> & {
  city?: City;
  categories?: (ParseObjectJSON & { name?: string })[];
};
