# switch-finance

The Switch finance dashboard: what each restaurant sold and owes Switch in commission, for any
period and by menu category, with Excel exports and printable invoices. Admins can always sign
in; other staff need an admin to give them finance access.

## Environments

| | Local | Staging | Production |
|---|---|---|---|
| Dashboard | http://localhost:3000 | https://switchfood-staging-finance.web.app | https://switch-finance.web.app |
| Server | switch-server-v2 on your machine | switch-server-v2 on staging | `api.switchfood.net` |
| Data | test data | test data | **real orders and restaurants** |
| How it gets there | `npm run dev:local` | merge into `stg` | run deploy-production on `main` |

## Run it locally

You need Node 24, Docker Desktop, and the `switch-server-v2` repository next to this one, set up
once as its onboarding guide says (`docs/00-onboarding.md` there).

```bash
npm install
cd ../switch-server-v2
pnpm dev:all --only finance    # local server + test data + this dashboard on :3000
```

Sign in as `admin` or `ops`, password `switch-dev`. If the local server is already running,
`npm run dev:local` here starts only the dashboard.

`npm run dev` (without `:local`) talks to the **production** server. Don't use it to try things
out.

## Ship a change to staging

1. Start from an up-to-date `stg`:

   ```bash
   git switch stg && git pull
   git switch -c fix/short-description
   ```

2. Make the change and try it locally. Then run what CI runs:

   ```bash
   npm run lint
   npm run build:staging    # type check, staging build, and no production address in it
   ```

3. Push and open a pull request into `stg`:

   ```bash
   git push -u origin fix/short-description
   gh pr create --base stg --fill
   ```

   CI checks the pull request: lint, type check, the staging build, a production-address check,
   a dependency audit and a secret scan. Fix anything red and push again.

4. Merge. Every merge into `stg` deploys to staging on its own in a few minutes
   (`gh run watch`). Don't push straight to `stg`: that deploys without review.

5. Test on https://switchfood-staging-finance.web.app with the staging accounts (ask the team
   for the password).

If the change needs a server change too, ship the server to staging first (switch-server-v2's
own `stg`), then the dashboard.

## Ship a change to production

Production deploys only by hand, from `main`, once the change has been on staging:

1. Merge `stg` into `main` through a pull request:

   ```bash
   gh pr create --base main --head stg --fill
   ```

2. Actions → **deploy-production** → Run workflow on `main`
   (`gh workflow run deploy-production --ref main`). It runs the same checks, builds with
   `.env.prod`, refuses a bundle that names staging or a local server, publishes it to
   https://switch-finance.web.app and checks the site serves that commit.

Ship the server change to production first (switch-server-v2's promote-production), then the
dashboard. Until switch-server-v2 serves production, the Access switches answer "not on the
server yet".

Setup, release order, rollback and troubleshooting: [docs/production.md](docs/production.md).

## Good to know

- Staging's one-time setup, rollback and troubleshooting: [docs/staging.md](docs/staging.md).
- Production's setup, release order and rollback: [docs/production.md](docs/production.md).
- A new `NEXT_PUBLIC_*` setting needs its staging value in `.env.staging` and its production
  value in `.env.prod`, or the builds fail.
- Totals are in Algiers time (a day runs from midnight to midnight in Algeria).
- Drivers' prepaid wallets (the Drivers page) run on switch-server-v2's wallet functions; what
  they do, their errors and the rollout order are in
  [docs/driver-wallet-backend.md](docs/driver-wallet-backend.md).
