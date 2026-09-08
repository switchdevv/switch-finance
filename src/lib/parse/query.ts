import type { ParsePointer } from '@/types/parse';
import { getParse } from './client';

/**
 * Mirrors the queryParams vocabulary the RN apps use (src/api/modules/objects.js in
 * switch-manager/switch-food) — an array of single-key filter objects — so this
 * reads familiar to anyone coming from those apps. Extend this union as new query
 * shapes are needed; only the subset the restaurants list/detail views use is here.
 */
export type QueryParam =
  | { equalTo: { key: string; value: unknown } }
  | { notEqualTo: { key: string; value: unknown } }
  | { matches: { key: string; value: string; modifiers?: string } }
  | { containedIn: { key: string; value: unknown[] } }
  | { exists: string }
  | { doesNotExist: string }
  | { include: string }
  | { select: string | string[] }
  | { limit: number }
  | { skip: number }
  | { ascending: string }
  | { descending: string }
  | { addAscending: string }
  | { addDescending: string }
  | { greaterThanOrEqualTo: { key: string; value: unknown } }
  | { lessThanOrEqualTo: { key: string; value: unknown } };

function newQuery(collection: string) {
  const ParseQuery = getParse().Query;
  return new ParseQuery(collection);
}

function applyParams(query: ReturnType<typeof newQuery>, params: QueryParam[]): void {
  for (const param of params) {
    if ('equalTo' in param) query.equalTo(param.equalTo.key, param.equalTo.value);
    else if ('notEqualTo' in param) query.notEqualTo(param.notEqualTo.key, param.notEqualTo.value);
    else if ('matches' in param) {
      query.matches(param.matches.key, escapeRegex(param.matches.value), param.matches.modifiers);
    } else if ('containedIn' in param) {
      query.containedIn(param.containedIn.key, param.containedIn.value);
    } else if ('exists' in param) query.exists(param.exists);
    else if ('doesNotExist' in param) query.doesNotExist(param.doesNotExist);
    else if ('include' in param) query.include(param.include);
    else if ('select' in param) query.select(param.select);
    else if ('limit' in param) query.limit(param.limit);
    else if ('skip' in param) query.skip(param.skip);
    else if ('ascending' in param) query.ascending(param.ascending);
    else if ('descending' in param) query.descending(param.descending);
    else if ('addAscending' in param) query.addAscending(param.addAscending);
    else if ('addDescending' in param) query.addDescending(param.addDescending);
    else if ('greaterThanOrEqualTo' in param) {
      query.greaterThanOrEqualTo(param.greaterThanOrEqualTo.key, param.greaterThanOrEqualTo.value);
    } else if ('lessThanOrEqualTo' in param) {
      query.lessThanOrEqualTo(param.lessThanOrEqualTo.key, param.lessThanOrEqualTo.value);
    }
  }
}

// `matches` compiles to a MongoDB regex server-side — an unescaped user string is
// both a crash risk (invalid regex) and a ReDoS vector once free-text search lands.
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Runs a `find` and returns every matching row as plain JSON. */
export async function find<T>(collection: string, params: QueryParam[] = []): Promise<T[]> {
  const query = newQuery(collection);
  applyParams(query, params);
  const results = await query.find();
  return results.map((item) => item.toJSON() as T);
}

/**
 * Runs a `first` and returns the row as plain JSON, or `null` if none matched.
 *
 * Deliberately not `Parse.Query#get(objectId)`: `get()` throws Parse error code 101
 * on a missing object, the same code as an invalid login and (on this backend) a
 * permission-denied read — three unrelated meanings colliding on one code. Filtering
 * by objectId with `first()` instead turns "not found" into a plain `null` the
 * caller can branch on directly, no try/catch for an expected case.
 */
export async function findOne<T>(collection: string, params: QueryParam[] = []): Promise<T | null> {
  const query = newQuery(collection);
  applyParams(query, params);
  const result = await query.first();
  return result ? (result.toJSON() as T) : null;
}

/** Runs a `count` query. Parse counts can be capped/disabled on large classes — see
 * hooks/use-restaurants.ts for the fallback when this rejects or is unavailable. */
export async function count(collection: string, params: QueryParam[] = []): Promise<number> {
  const query = newQuery(collection);
  applyParams(query, params);
  return query.count();
}

/**
 * Builds the JSON pointer literal a `equalTo` on a relation expects — the web
 * equivalent of the RN apps' `getPointerFromId` (src/api/modules/objects.js). A plain
 * literal rather than a real Parse.Object: the SDK passes an unknown object straight
 * through to the request body, so this is exactly what the server receives either way,
 * and it keeps callers (and their tests) free of the browser-only SDK singleton.
 */
export function pointer<ClassName extends string>(
  className: ClassName,
  objectId: string,
): ParsePointer<ClassName> {
  return { __type: 'Pointer', className, objectId };
}
