// `npm run build:production`: the static export built with .env.prod, then refused unless it talks
// to production only. CI deploys exactly this bundle to production (docs/production.md), so neither
// a local production build nor the deployed one can name staging or a laptop server. The check
// reads the exported files in out/, not the config: they are what browsers get.
//
// - NEXT_PUBLIC_PARSE_SERVER_URL must be the production server, exactly.
// - Every NEXT_PUBLIC_* value in .env.prod must be in the bundle (the build used the file).
// - No staging or local value may be in it.
//
// The same file is in switch-ops, switch-finance and switch-admin; keep them identical.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';

const PRODUCTION_SERVER = 'https://api.switchfood.net';

// Values a production bundle must never contain: a staging or local server behind production's
// staff would send their sign-ins and every order they touch to test data.
// Written as URLs: libraries mention a bare "localhost" (a URL parser compares hosts with it).
const NON_PRODUCTION_VALUES = [
  '.appspot.com', // App Engine hosts: staging, or a version URL instead of the domain
  '://localhost', // a laptop server (`npm run dev:local`, `pnpm dev:all`)
  '://127.0.0.1',
  '431b35358841665c3ed0', // the staging Pusher key
  'b4cb8ea88897dba8ec3b', // the dev Pusher key (local `pnpm dev:all`)
];

const ENV_FILE = '.env.prod';
const OUT_DIR = 'out';
// Pages, scripts and the router's payloads: where NEXT_PUBLIC_* values are inlined.
const TEXT_FILES = new Set(['.html', '.js', '.txt', '.json']);

function fail(problems) {
  const prefix = process.env.GITHUB_ACTIONS ? '::error::' : '✗ ';
  for (const problem of problems) console.error(prefix + problem);
  console.error('\nThis production build must not be deployed.');
  process.exit(1);
}

// Into process.env, where Next reads them first: .env.local only fills in what is missing. A
// variable already exported in the shell still wins; the checks catch it.
// (`node --env-file` can't do this: Next hands that flag on to its workers, which refuse it.)
process.loadEnvFile(ENV_FILE);
const serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL ?? '';
if (serverURL !== PRODUCTION_SERVER) {
  fail([
    `NEXT_PUBLIC_PARSE_SERVER_URL is "${serverURL}", not ${PRODUCTION_SERVER} ` +
      `(${ENV_FILE}, or a value exported in your shell).`,
  ]);
}

const next = createRequire(import.meta.url).resolve('next/dist/bin/next');
const build = spawnSync(process.execPath, [next, 'build'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

const expected = Object.entries(process.env).filter(
  ([key, value]) => key.startsWith('NEXT_PUBLIC_') && value,
);
const problems = [];

const unused = new Set(expected.map(([key]) => key));
const leaks = new Map(); // non-production value → first file that contains it
for (const file of readdirSync(OUT_DIR, { recursive: true })) {
  if (!TEXT_FILES.has(extname(file))) continue;
  const text = readFileSync(join(OUT_DIR, file), 'utf8');
  for (const [key, value] of expected) if (unused.has(key) && text.includes(value)) unused.delete(key);
  for (const value of NON_PRODUCTION_VALUES) if (!leaks.has(value) && text.includes(value)) leaks.set(value, file);
}

for (const [value, file] of leaks) problems.push(`${OUT_DIR}/${file} contains the non-production value "${value}".`);
for (const key of unused) {
  problems.push(`The bundle doesn't contain ${key}: no code reads it any more, or the build didn't use ${ENV_FILE}.`);
}

if (problems.length > 0) fail(problems);
console.log(`\nProduction bundle checked: it talks to ${serverURL} and contains no staging or local value.`);
