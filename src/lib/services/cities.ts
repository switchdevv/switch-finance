import { find } from '@/lib/parse/query';
import type { City } from '@/types/city';

const COLLECTION = 'City';

/** Parse's own ceiling on one find. */
const PAGE = 1000;
/** Far above any real number of regions; only stops a runaway loop. */
const MAX_CITIES = 10_000;

/**
 * Every city — the filters' dropdowns and the wallet settings' region list. Read whole and
 * paged around Parse's 1000-row ceiling: the settings page has to list every region, however
 * many there are. `select` keeps the geofence polygon — by far the largest column on the
 * class — off the wire.
 */
export async function listCities(): Promise<City[]> {
  const cities: City[] = [];
  for (let skip = 0; skip < MAX_CITIES; skip += PAGE) {
    const page = await find<City>(COLLECTION, [
      { select: ['name', 'currency'] },
      { ascending: 'name' },
      { addAscending: 'objectId' },
      { limit: PAGE },
      { skip },
    ]);
    cities.push(...page);
    if (page.length < PAGE) break;
  }
  return cities;
}
