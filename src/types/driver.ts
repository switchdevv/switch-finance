import type { ParseFileJSON, ParsePointer } from './parse';
import type { SwitchUser } from './user';

/**
 * A driver: a `_User` whose `appType` holds 'driver' (the driver app appends it on login).
 * Narrowed to what the Drivers page shows — see lib/services/drivers.ts.
 */
export type Driver = Pick<SwitchUser, 'objectId' | 'createdAt' | 'updatedAt' | 'username' | 'fullname' | 'appType' | 'enabled'> & {
  phone?: string;
  picture?: ParseFileJSON;
  city?: ParsePointer<'City'>;
  /** The driver's own GO switch. Refused by the server while an enforced wallet is empty. */
  driverActive?: boolean;
};
