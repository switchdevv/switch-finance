import { find, findOne, type QueryParam } from '@/lib/parse/query';
import type { Driver } from '@/types/driver';

const COLLECTION = '_User';

/**
 * The only `_User` fields the Drivers page reads — the same narrowing as the staff list
 * (lib/services/staff.ts): nothing personal beyond what finance calls the driver about.
 * `_User` rows are publicly readable on this backend (docs/finance-access-backend.md §4).
 */
const DRIVER_FIELDS = [
  'username',
  'fullname',
  'phone',
  'picture',
  'appType',
  'enabled',
  'city',
  'driverActive',
];

/** One Parse page; the fleet is read whole and searched in the browser. */
const PAGE = 1000;
/** Far above today's fleet; only stops a runaway loop. */
const MAX_DRIVERS = 5000;

const DRIVER_PARAMS: QueryParam[] = [
  // An array column: matches every row whose `appType` holds 'driver'.
  { equalTo: { key: 'appType', value: 'driver' } },
  { select: DRIVER_FIELDS },
];

/**
 * Every driver account, by name. Read whole — switch-ops does the same — because the list
 * is joined to the wallets in the browser and searched, filtered and paged there.
 */
export async function listDrivers(): Promise<Driver[]> {
  const drivers: Driver[] = [];
  for (let skip = 0; skip < MAX_DRIVERS; skip += PAGE) {
    const page = await find<Driver>(COLLECTION, [
      ...DRIVER_PARAMS,
      { ascending: 'fullname' },
      { addAscending: 'objectId' },
      { limit: PAGE },
      { skip },
    ]);
    drivers.push(...page);
    if (page.length < PAGE) break;
  }
  return drivers;
}

/** One driver's account, or null when no driver has that id. */
export function getDriver(objectId: string): Promise<Driver | null> {
  return findOne<Driver>(COLLECTION, [
    ...DRIVER_PARAMS,
    { equalTo: { key: 'objectId', value: objectId } },
  ]);
}
