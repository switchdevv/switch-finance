import type { ParseObjectJSON } from './parse';

/**
 * The subset of `_User` this app reads. Deliberately not the whole class: the rows on
 * this backend also carry `pushToken`, `favorites`, `promosUsed`, `cartFood`, `authData`
 * and more, none of which finance has any business fetching — every query that touches
 * `_User` narrows to these fields with `select` (see lib/services/staff.ts).
 *
 * Everything but ParseObjectJSON is optional, per the rule in types/parse.ts: Parse rows
 * are sparse, and an account created before a field existed simply won't have it.
 */
export type SwitchUser = ParseObjectJSON & {
  username?: string;
  fullname?: string;
  email?: string;
  /** Which Switch apps this account has signed into — 'food', 'driver', 'manager',
   * 'staff'. Appended to by the apps themselves on login (switch-food's
   * navigation/root.js does exactly this), so it is self-writable and can never be the
   * thing that grants finance access. */
  appType?: string[];
  /** The staff role, when the account has one. 'Admin' is the only value finance cares
   * about; see lib/auth/access.ts. */
  staffType?: string;
  /** Finance access granted by an admin. Writable only by the `setFinanceAccess` cloud
   * function — see docs/finance-access-backend.md. */
  financeAccess?: boolean;
  /** The platform's own account switch, set to `true` at signup by every RN app. `false`
   * means the account is shut off entirely. */
  enabled?: boolean;
};
