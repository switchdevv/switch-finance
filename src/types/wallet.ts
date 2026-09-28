import type { CurrencyCode } from './city';

/**
 * Drivers' prepaid wallets, as switch-server-v2's wallet functions answer them (D-25; spec:
 * docs/driver-wallet-backend.md). Nothing here is read from a Parse class: the wallets live
 * in server-only collections and every figure is computed on the server, so this app only
 * ever displays what it is given.
 *
 * A wallet counts **orders**, in hundredths (`units`), each locked at the price it was
 * bought at. Amounts are DA (the driver's city currency); dates are ISO strings.
 */

/** The rules one driver's wallet is held to: global, or their region's where it sets any. */
export type WalletSettings = {
  /** Off: nothing is refused and no alert is pushed; balances are still kept. */
  enforced: boolean;
  /** Going online needs at least this many orders. */
  minOrders: number;
  /** At or under this many orders the driver is warned. */
  lowOrders: number;
};

/** A region's own values; a missing key follows the global one. */
export type RegionWalletSettings = Partial<WalletSettings>;

/**
 * Parse Config `driverWallet`, set by admins from the Drivers page: the global rules, and per
 * region (`City` objectId) only the values that region sets itself.
 */
export type WalletConfig = WalletSettings & {
  regions: Record<string, RegionWalletSettings>;
};

export type WalletLevel = 'ok' | 'low' | 'empty';

export type WalletSummary = {
  driverId: string;
  /** Only the driver's deliveries placed from here on count. */
  startsAt: string;
  closedAt: string | null;
  /** Hundredths of an order; negative when the driver used more than they held. */
  units: number;
  ordersLeft: number;
  /** What the orders left are worth at what was paid for them (a full refund); negative:
   * the driver owes Switch. */
  value: number;
  /** Today's service fee in the driver's city: the price of a top-up right now. */
  unitPriceToday: number | null;
  currency: CurrencyCode | null;
  level: WalletLevel;
  /** Whether the rules for this driver's region hold them to the wallet right now. */
  enforced: boolean;
  lastTopUp: { at: string; orders: number; amount: number } | null;
};

export type WalletActor = { id: string; name: string | null };

export type TopUpMethod = 'cash' | 'transfer' | 'carriedOver';

export type OrderChangeKind = 'status' | 'canceled' | 'reassigned' | 'money' | 'deleted';

export type LedgerEntryLine = {
  type: 'entry';
  id: string;
  kind: 'topup' | 'refund' | 'adjustment' | 'orderChange';
  at: string;
  units: number;
  /** In the balance: not voided, and not an order-change note. */
  counted: boolean;
  unitPrice: number | null;
  amount: number;
  method: TopUpMethod | null;
  reference: string | null;
  note: string | null;
  by: WalletActor;
  voided: { at: string; by: WalletActor; reason: string } | null;
  /** An `orderChange` note: what staff changed on a delivered order, and the orders it
   * gave back (+) or took (−) — already in the balance through the order itself. */
  order: {
    id: string;
    change: OrderChangeKind;
    from: unknown;
    to: unknown;
    effect: number;
  } | null;
  balanceAfter: number;
};

export type LedgerOrderLine = {
  type: 'order';
  id: string;
  /** The order's `createdAt`: orders carry no delivered-at date. */
  at: string;
  /** −100 for an ordinary delivery; positive for a free delivery Switch owes the driver. */
  units: number;
  /** DA per order it was priced at. */
  price: number;
  freeDelivery: boolean;
  balanceAfter: number;
};

export type LedgerLine = LedgerEntryLine | LedgerOrderLine;

export type WalletLedger = {
  summary: WalletSummary;
  range: {
    from: string;
    to: string;
    openingUnits: number;
    closingUnits: number;
    used: number;
    credited: number;
    deliveries: number;
    toppedUp: { units: number; amount: number };
    refunded: { units: number; amount: number };
  };
  /** Newest first. */
  lines: LedgerLine[];
  truncated: boolean;
};

export type WalletList = { config: WalletConfig; wallets: WalletSummary[] };

export type WalletDetail = {
  /** The rules this driver is held to (their region's, else global). */
  settings: WalletSettings;
  /** What a top-up would cost today — known whether or not the driver has a wallet. */
  pricing: { unitPriceToday: number | null; currency: CurrencyCode | null };
  /** null: the driver has no wallet yet. */
  ledger: WalletLedger | null;
};

/** What every recording function answers. */
export type WalletWriteResult = {
  entry?: { id: string; amount: number; units: number };
  summary: WalletSummary | null;
};
