import { find } from '@/lib/parse/query';
import type { City } from '@/types/city';

const COLLECTION = 'City';

/**
 * Every city, for the directory's city filter. Unpaginated on purpose: this backend
 * serves a handful of cities, and a dropdown that pages is worse than one that doesn't.
 * `select` keeps the geofence polygon — by far the largest column on the class — off
 * the wire.
 */
export function listCities(): Promise<City[]> {
  return find<City>(COLLECTION, [
    { select: ['name', 'currency'] },
    { ascending: 'name' },
    { limit: 200 },
  ]);
}
