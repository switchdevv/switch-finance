import { getParse } from './client';

/**
 * The write half of the Parse layer, kept in its own module so `query.ts` stays what its
 * name says — nothing in this app can accidentally acquire the ability to write by
 * importing a read helper.
 *
 * Every write goes through a cloud function rather than `object.save()`, and that isn't a
 * style choice: `_User` rows on this backend carry an owner-only-write ACL
 * (`{"*":{"read":true},"<ownId>":{"read":true,"write":true}}`), so an admin's browser
 * simply cannot save another account's row. Only master-key server code can, which makes
 * `Parse.Cloud.run` the only door.
 */
export function callFunction<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
  return getParse().Cloud.run(name, params) as Promise<T>;
}
