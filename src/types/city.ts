import type { ParseObjectJSON } from './parse';

/** Currency codes stored on `City.currency`, with the symbols the RN apps render them
 * with (switch-manager/src/localization/langs/*.json → `currency`). */
export type CurrencyCode = 'dzd' | 'usd' | 'eur';

/**
 * The `City` class. Only the fields this dashboard reads are modeled: `name` for the
 * directory filter and `currency` for every money figure on a restaurant's report.
 *
 * `fees` (per-city service fee, see switch-food/src/screens/Cart/Checkout.js:142) is
 * deliberately left out — the service fee is already baked into each order's
 * `options.service`, so reading it from the city would only invite recomputing a number
 * the order already carries.
 */
export type City = ParseObjectJSON & {
  name?: string;
  currency?: CurrencyCode;
};
