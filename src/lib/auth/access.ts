import type { SwitchUser } from '@/types/user';

/**
 * Who may use Switch Finance, expressed once.
 *
 * Deliberately free of React and of the Parse SDK: the rule is read from a plain object,
 * so it can be applied to a `_User` row fetched from the server (useAccess), to the user
 * object the login response hands back (useLogin), and to a row in the admin table —
 * three call sites that would otherwise each grow their own slightly different version of
 * the same ladder.
 *
 * `admin` is a role on the account itself; `member` is access an admin granted. The
 * distinction matters beyond the gate: only admins see /access.
 */
export type FinanceRole = 'admin' | 'member' | null;

/** The `staffType` value that means platform admin. */
export const ADMIN_STAFF_TYPE = 'Admin';

/**
 * Every `staffType` that makes an account staff. Nothing in code writes this field — the
 * RN apps' signup only clears it (`user.set("staffType", undefined)`), so it is typed by
 * hand in the Parse dashboard. These are the canonical spellings, not an enforced enum,
 * which is why every comparison against them is case-insensitive.
 */
export const STAFF_TYPES: readonly string[] = [ADMIN_STAFF_TYPE, 'Staff'];

/**
 * The `appType` members that mark an account as staff. Unlike `staffType` these are
 * machine-written and lowercase by convention — every RN app's `APP_TYPE` constant
 * ('food', 'driver', 'manager') is — so they are matched exactly.
 */
export const STAFF_APP_TYPES: readonly string[] = ['staff', 'admin'];

/**
 * The `staffType` spellings a Parse query has to enumerate.
 *
 * `containedIn` is an exact match server-side while the rule below is case-insensitive,
 * so a row typed `staff` instead of `Staff` would pass the gate and be missing from
 * /access — the same listed-vs-admitted split this pool definition exists to close.
 * Enumerating the casings a human plausibly types keeps the two in step.
 */
export const STAFF_TYPE_QUERY_VALUES: readonly string[] = STAFF_TYPES.flatMap((type) => [
  type,
  type.toLowerCase(),
  type.toUpperCase(),
]);

/** Just the fields the rule reads — so callers can pass a full row or a projection. */
export type AccessFields = Pick<SwitchUser, 'staffType' | 'appType' | 'financeAccess' | 'enabled'>;

/**
 * Whether the account is staff at all. Both halves are required:
 *
 * - `staffType` names the role, and is the trustworthy half — the backend's `beforeSave`
 *   trigger (docs/finance-access-backend.md §3) refuses to let an account write it.
 * - `appType` says which Switch apps the account belongs to, and is checked because an
 *   account can hold a `staffType` from a past role without being provisioned for the
 *   staff app. It cannot carry the rule on its own: switch-food appends to `appType` on
 *   every login, so it is self-writable by design and trivially forged.
 *
 * This is both the gate's staff test and the pool /access lists, deliberately the same
 * predicate — when they were two (gate on `financeAccess` alone, list on `appType`) an
 * account could be admitted by one and invisible to the other, with no way for an admin
 * to revoke it from the UI.
 */
export function isStaffAccount(user: AccessFields | null | undefined): boolean {
  if (!user) return false;

  const staffType = user.staffType?.trim().toLowerCase();
  if (!staffType || !STAFF_TYPES.some((type) => type.toLowerCase() === staffType)) return false;

  return user.appType?.some((type) => STAFF_APP_TYPES.includes(type)) ?? false;
}

/**
 * The ladder, in order:
 *
 * 1. `enabled === false` denies unconditionally — a shut-off account stays shut off even
 *    if it is an admin. Note the explicit `=== false`: a row that never had the field
 *    written is not a disabled account, and treating `undefined` as "disabled" would lock
 *    out every account older than the field.
 * 2. Not staff → denied, admins included. This runs before the admin branch on purpose:
 *    a `staffType` with no matching `appType` is an account that was never provisioned
 *    for staff, and the fix is to provision it, not to let it in.
 * 3. `staffType === 'Admin'` → admin. Compared case-insensitively: this vocabulary lives
 *    in the Parse dashboard where a human types it, not in an enum any code enforces.
 * 4. `financeAccess === true` → member.
 * 5. Otherwise no access.
 */
export function financeRole(user: AccessFields | null | undefined): FinanceRole {
  if (!user) return null;
  if (user.enabled === false) return null;
  if (!isStaffAccount(user)) return null;
  if (user.staffType?.trim().toLowerCase() === ADMIN_STAFF_TYPE.toLowerCase()) return 'admin';
  if (user.financeAccess === true) return 'member';
  return null;
}

export function isFinanceAdmin(user: AccessFields | null | undefined): boolean {
  return financeRole(user) === 'admin';
}

export function canAccessFinance(user: AccessFields | null | undefined): boolean {
  return financeRole(user) !== null;
}

export const ROLE_LABELS: Record<'admin' | 'member' | 'none', string> = {
  admin: 'Admin',
  member: 'Has access',
  none: 'No access',
};
