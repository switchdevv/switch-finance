import { count, find, findOne, type QueryParam } from '@/lib/parse/query';
import { STAFF_APP_TYPES, STAFF_TYPE_QUERY_VALUES } from '@/lib/auth/access';
import type { SwitchUser } from '@/types/user';

/**
 * `_User` is the class's real name. Passing `'User'` would work too — the SDK rewrites it
 * (ParseQuery's constructor, guarded by PERFORM_USER_REWRITE, which defaults on), which is
 * why the RN apps' `COLLECTIONS.User = 'User'` hits the same rows — but the underscore
 * form is what the server actually stores and what the dashboard shows, so it's the one
 * spelled here.
 */
const COLLECTION = '_User';

export const STAFF_PAGE_SIZE = 20;

/**
 * The fields every `_User` read in this app is narrowed to. `_User` rows on this backend
 * are large and personal — `pushToken`, `favorites`, `promosUsed`, `cartFood`, `address`,
 * `authData` — and none of that belongs in a finance payload. Parse already withholds
 * `authData`/`sessionToken` from non-master reads, but that's the server's floor, not a
 * reason to ask for the rest.
 */
const ACCESS_FIELDS = [
  'username',
  'fullname',
  'email',
  'appType',
  'staffType',
  'financeAccess',
  'enabled',
];

/** Which slice of the staff pool to show. */
export type AccessFilter = 'all' | 'granted' | 'denied';

export type StaffFilters = {
  access: AccessFilter;
  /** Matched against `username`, case-insensitively. */
  search?: string;
};

export const DEFAULT_FILTERS: StaffFilters = { access: 'all' };

/**
 * One filter → params translation shared by the rows query and the count query, so the
 * grid and its "of N" total can never describe different sets.
 *
 * The two pool filters are the server-side spelling of `isStaffAccount` — the same
 * predicate the gate applies, so this page cannot list an account the gate would turn
 * away, or hide one it lets in.
 *
 * Both are `containedIn`, which Parse reads differently per column and correctly in each
 * case: on `appType`, an array column, it matches a row whose array holds any of the
 * values ("is staff or admin"); on `staffType`, a string, it matches a row equal to any
 * of them.
 *
 * `notEqualTo: true` (rather than `equalTo: false`) is what makes `denied` correct: the
 * field is new, so the overwhelming majority of accounts have never had it written at
 * all, and `equalTo: false` would match none of them.
 */
export function buildFilterParams(filters: StaffFilters): QueryParam[] {
  const params: QueryParam[] = [
    { containedIn: { key: 'appType', value: [...STAFF_APP_TYPES] } },
    { containedIn: { key: 'staffType', value: [...STAFF_TYPE_QUERY_VALUES] } },
  ];

  if (filters.access === 'granted') {
    params.push({ equalTo: { key: 'financeAccess', value: true } });
  } else if (filters.access === 'denied') {
    params.push({ notEqualTo: { key: 'financeAccess', value: true } });
  }

  const search = filters.search?.trim();
  if (search) {
    // One field, like the restaurants directory's `searchName` — the QueryParam union has
    // no `or`, so a multi-field search would need two queries merged client-side, and
    // usernames are what an admin actually knows an account by. Unlike Restaurant there's
    // no lowercased copy of the field to match against, hence the 'i' modifier. The value
    // itself is regex-escaped inside applyParams.
    params.push({ matches: { key: 'username', value: search, modifiers: 'i' } });
  }

  return params;
}

export type ListStaffParams = {
  page: number; // 1-based
  pageSize?: number;
  filters?: StaffFilters;
};

/** Sorted by `username`, not `createdAt`: this is a list an admin scans for a specific
 * person, and a stable alphabetical order is what makes that possible. The pool is small
 * enough that an unindexed sort is not the concern it would be on Restaurant. */
export function listStaff({
  page,
  pageSize = STAFF_PAGE_SIZE,
  filters = DEFAULT_FILTERS,
}: ListStaffParams): Promise<SwitchUser[]> {
  return find<SwitchUser>(COLLECTION, [
    ...buildFilterParams(filters),
    { select: ACCESS_FIELDS },
    { ascending: 'username' },
    { limit: pageSize },
    { skip: (page - 1) * pageSize },
  ]);
}

export function countStaff(filters: StaffFilters = DEFAULT_FILTERS): Promise<number> {
  return count(COLLECTION, buildFilterParams(filters));
}

/**
 * One account's access fields, read from the server rather than from the cached session.
 *
 * This is what makes a revoked grant take effect: `Parse.User.currentAsync()` reads
 * localStorage, so an account whose access was removed after it signed in would keep
 * seeing the app until the session token itself expired.
 */
export function getAccessFor(objectId: string): Promise<SwitchUser | null> {
  return findOne<SwitchUser>(COLLECTION, [
    { equalTo: { key: 'objectId', value: objectId } },
    { select: ACCESS_FIELDS },
  ]);
}
