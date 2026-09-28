# Drivers' prepaid wallets — backend requirements

**Audience:** whoever owns the Parse Server behind `api.switchfood.net`, and whoever changes the
Drivers page.
**Status:** built in switch-server-v2 as D-25 (`src/cloud/functions/driver-wallet.ts`,
`src/cloud/wallet-book.ts`, `src/cloud/driver-wallets.ts`; decision record
`docs/adr/0003-driver-wallet-derived-ledger.md`). Legacy switch-server never gets it, so until v2
serves production every wallet call answers `141 Invalid function` and the Drivers page says
"not on the server yet".

## What it is

Cash orders leave Switch's service fee in the driver's hands. Drivers prepay it for a batch of
orders (say 50), so Switch never has to chase a driver who quits, and pays back what is left
when they go. Until now that was kept by hand.

- **Only the driver's delivered orders** (status 3, not canceled) use the prepayment.
- **Orders are locked at purchase.** A top-up buys N orders at that day's service fee in the
  driver's city (`City.fees.food.service`). A later fee change never changes them, and a refund
  pays each order back at what it cost.
- **What a delivery uses** is switch-dashboard's per-driver formula, as ops uses it
  (switch-ops `src/lib/ops/driver-settlement.ts`): cash → the order's service fee, or
  `service − delivery` on a free delivery; otherwise `−delivery`. Divided by the order's own
  service fee, an ordinary delivery is exactly one order. A free delivery gives orders back: a
  150 DA fee Switch owes, at 50 DA, is +3, so the delivery nets **+2**. A `freeall` order,
  which carries no service fee, is priced at today's city fee.
- **Deliveries use the oldest orders first**, so the orders left are always the newest ones
  bought. Their value — the refund — is each at its own price.
- **The driver app shows orders, never money.**

## Why the client can't do this alone

A driver goes online by saving `driverActive: true` on their own `_User` row, and that row is
owner-writable. Only a server-side check can refuse it, so the gate is in `beforeSave _User`
(§3). The wallets themselves are kept where no client can reach them: in plain MongoDB
collections, read and written only by the functions below.

---

## 1. Storage

Nothing to create in the Parse Dashboard. v2 keeps two plain MongoDB collections, next to
`driverOffers`:

| Collection | One document per | Holds |
|---|---|---|
| `driverWallets` | driver (`_id` = `_User` objectId) | `startsAt` (only deliveries placed from here count), `createdAt`, `createdBy`, `closedAt`, and the last alert sent (`alert`, `alertAt`) |
| `driverWalletEntries` | top-up, refund, adjustment or order-change note (`_id` = the client's request id) | `driverId`, `kind`, `units` (hundredths of an order, ± — always 0 for a note), `unitPrice`, `amount` (DA), `method`, `reference`, `note`, `at`, `by`, `voided`, `order` |

**The balance is never stored.** It is the entries (voided ones left out) plus the driver's
delivered orders, read on every request. Whatever changes an order after delivery — ops setting
its status back, canceling it, correcting its fees, handing it to another driver, deleting it,
an edit in the Parse Dashboard, or the legacy server during the canary — the next read has it
right.

Indexes: balances read `Order` by driver and date, served by `{ _p_driver: 1, _created_at: -1 }`
(`ops_order_driver_created`, switch-ops `docs/backend-performance.md`). **Confirm it exists in
Atlas before enforcing.** `driverWalletEntries` stays small; `{ driverId: 1, at: -1 }` is worth
adding once it grows.

## 2. Settings

Parse Config `driverWallet`:

| Key | Default | Meaning |
|---|---|---|
| `enforced` | `false` | Off: balances are kept, nobody is refused, no alert is pushed (a top-up receipt still is). |
| `minOrders` | `1` | Going online needs at least this many orders. |
| `lowOrders` | `10` | At or under this many, the driver is warned once. |

Admins set it from the Drivers page (Wallet settings), through the existing admin-only
`updateConfigs`, which merges key by key.

## 3. The online gate — `beforeSave _User`

A non-master save that turns `driverActive` on (on an update: whenever it is written as
`true`), while `driverWallet.enforced`, is refused when the driver holds fewer than `minOrders`
orders:

```
142  WALLET_EMPTY
```

- Every way of getting orders needs `driverActive`: the automatic search, `assignDriver`, and
  the ops queue (which waits for it after each delivery). So this one check is enough.
- The driver app's `putUser` reports it as `FAILED_TO_UPDATE_USER - 142`. New builds show
  "top up to go online"; builds from before the wallet show their generic connection error and
  stay offline.
- A signup is never refused over it: a new account is saved offline instead.
- Saves that don't turn it on (location, push token, profile) never read the wallet.

## 4. Cloud functions

All throw `Parse.Error`s, read by code **and message**:

| Code | Message | When |
|---|---|---|
| 209 | — | No session. |
| 119 | `FINANCE_REQUIRED` | The caller isn't a switch-finance user: enabled, a staff account (`staffType` Staff/Admin **and** a staff/admin `appType`), and `Admin` or granted `financeAccess`. The same ladder as `src/lib/auth/access.ts`. |
| 119 | `ADMIN_REQUIRED` | An admin-only function called by a member. |
| 102 | `WALLET_INVALID_PARAMS` | A missing or malformed parameter. |
| 101 | `WALLET_DRIVER_NOT_FOUND`, `WALLET_NOT_STARTED`, `WALLET_ENTRY_NOT_FOUND` | |
| 142 | `WALLET_NOT_A_DRIVER`, `WALLET_NO_CITY`, `WALLET_NO_SERVICE_FEE`, `WALLET_NOTHING_TO_REFUND`, `WALLET_REFUND_EXCEEDS_BALANCE`, `WALLET_REQUEST_REUSED`, `WALLET_ENTRY_VOIDED`, `WALLET_ENTRY_NOT_VOIDABLE` | A refused operation. |
| 141 | `Invalid function: …` | The server has no wallet functions (legacy). |

The client maps them in `walletErrorKey` (`src/lib/parse/errors.ts`).

| Function | Who | Params | Returns |
|---|---|---|---|
| `getMyWallet` | the driver app | — | `{ enforced, state: 'off'\|'ok'\|'low'\|'empty', ordersLeft, canGoOnline, minOrders, lowOrders }` — no money |
| `listDriverWallets` | finance | — | `{ settings, wallets: WalletSummary[] }` |
| `getDriverWallet` | finance | `driverId, from?, to?` (ISO, ≤400 days; last 30 by default) | `{ settings, pricing: { unitPriceToday, currency }, ledger: null \| { summary, range, lines, truncated } }` |
| `recordWalletTopUp` | finance | `driverId, orders, method: 'cash'\|'transfer'\|'carriedOver', requestId, reference?, note?, startsAt?` | `{ entry, summary }` |
| `recordWalletRefund` | finance | `driverId, requestId, orders?` (default all), `close?` (full refund only), `note?`, `dryRun?` | `{ entry, summary }`, or with `dryRun` `{ preview: { units, amount } }` |
| `recordWalletAdjustment` | admin | `driverId, requestId, orders` (±), `reason, unitPrice?` (adds only; default today's fee, 0 = no cash value) | `{ entry, summary }` |
| `voidWalletEntry` | admin | `entryId, reason` | `{ summary }` |

Types: `src/types/wallet.ts`. Amounts are DA, `units` are hundredths of an order, dates are ISO
strings.

- **`requestId`** is made when a dialog opens (`crypto.randomUUID()`). The server keys the entry
  by it, so a double click or a retry after a timeout records it once. The same id sent for a
  different driver or kind is refused (`WALLET_REQUEST_REUSED`).
- **A top-up** opens the wallet the first time. `startsAt` is only read then: now by default,
  or the start of an earlier day to carry over a balance kept by hand (at most a year back).
  A top-up after a closing refund opens the wallet again.
- **A refund** takes the oldest orders first, each at its own price. The dialog shows the
  `dryRun` amount before anything is recorded, so what is shown is what is handed over.
- **A void** leaves the entry on the ledger, struck through, and out of every balance. An
  order-change note can't be voided: it describes an order, and the order is what counts.

## 5. What the server does on its own

- **After a delivery** (`finishDriver`): warns the driver once when they reach `lowOrders`,
  and once when they run out. The alert level is a compare-and-set on the wallet, so the push
  goes out once.
- **After a staff edit of an order** (`editOrder`, `assignDriver`, `chooseDriver`,
  `deleteOrders`): notes on the ledger of each wallet the order counted for, before or after,
  what changed and the orders it gave back or took. For example: "Order #A1B2C3 changed · Status
  Delivered → On the way · 1 returned". The balance already follows the order. Edits made
  outside these functions leave no note.
- **After a refund, a negative adjustment or a void**, or a staff edit that leaves an enforced
  wallet empty: the driver is set offline and told.
- **A top-up** always pushes the driver a receipt in orders, enforced or not.

Pushes carry `data: { wallet: 'refresh', icon }` with an icon every driver build knows
(`alert`, `error`, `success`), `tag: 'wallet'`, and the driver's language (en/fr/ar).

## 6. Rollout order

1. switch-server-v2 with D-25. It changes nothing while `enforced` is off.
2. This dashboard. It shows "not on the server yet" until v2 serves production.
3. Once v2 serves production: confirm the `Order` index in Atlas.
4. Finance opens a wallet for every active driver: a top-up with **Carried over** and the
   start date of the balance kept by hand.
5. The driver app release with the wallet (orders left, banner, refusal popup). Wait for
   drivers to update.
6. An admin turns on **Enforce wallets**. The settings dialog first lists the drivers online
   without enough orders.
