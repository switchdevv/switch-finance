import type { Driver } from '@/types/driver';
import type { RegionWalletSettings, WalletConfig, WalletSettings, WalletSummary } from '@/types/wallet';

/**
 * How the Drivers page reads a wallet. The figures themselves are the server's
 * (switch-server-v2 D-25) — nothing here computes a balance; it only sorts drivers into the
 * states the list filters and colours by.
 */

/** A driver's wallet as a list state: its level, or why it has none. */
export type DriverWalletState = 'ok' | 'low' | 'empty' | 'none' | 'closed';

export const DRIVER_WALLET_STATES: readonly DriverWalletState[] = [
  'ok',
  'low',
  'empty',
  'none',
  'closed',
];

export function driverWalletState(wallet: WalletSummary | undefined): DriverWalletState {
  if (!wallet) return 'none';
  // Closed by a full refund and not topped up since: the driver left.
  if (wallet.closedAt && wallet.units <= 0) return 'closed';
  return wallet.level;
}

/** 1 order = 100 units. */
export const UNITS_PER_ORDER = 100;

/**
 * The rules for a driver in `cityId`: enforced only while the global switch is on and their
 * region isn't left out; thresholds from their region where it sets one, else the global ones. The server's `walletSettingsFor` (switch-server-v2 src/domain/driver-wallet.ts)
 * is what enforces them; this copy only lets the settings dialog preview a draft.
 */
export function walletSettingsFor(config: WalletConfig, cityId: string | null | undefined): WalletSettings {
  const region = (cityId && config.regions[cityId]) || {};
  return {
    enforced: config.enforced && region.enforced !== false,
    minOrders: region.minOrders ?? config.minOrders,
    lowOrders: region.lowOrders ?? config.lowOrders,
  };
}

/**
 * Where wallets are enforced. The global switch is a master switch: off is nowhere, whatever a
 * region says; on is everywhere but the regions left out (named by id).
 */
export type Enforcement =
  | { kind: 'everywhere' }
  | { kind: 'nowhere' }
  | { kind: 'except'; cityIds: string[] };

export function enforcementOf(config: WalletConfig): Enforcement {
  if (!config.enforced) return { kind: 'nowhere' };
  const leftOut = Object.entries(config.regions)
    .filter(([, region]) => region.enforced === false)
    .map(([cityId]) => cityId);
  return leftOut.length ? { kind: 'except', cityIds: leftOut } : { kind: 'everywhere' };
}

/**
 * Drivers online right now whom the gate would refuse under `config` — what turning
 * enforcement on, or raising a minimum, would take offline at their next delivery. The server
 * only checks when a driver goes online, so these keep their current session.
 */
export function onlineWithoutEnough(
  drivers: readonly Driver[],
  wallets: ReadonlyMap<string, WalletSummary>,
  config: WalletConfig,
): Driver[] {
  return drivers.filter((driver) => {
    if (driver.driverActive !== true || driver.enabled === false) return false;
    const settings = walletSettingsFor(config, driver.city?.objectId);
    if (!settings.enforced) return false;
    const units = wallets.get(driver.objectId)?.units ?? 0;
    return units < settings.minOrders * UNITS_PER_ORDER;
  });
}

/** Whole, at least one, and the warning at or above the minimum. */
export function isWalletSettingsValid(settings: WalletSettings): boolean {
  return (
    Number.isInteger(settings.minOrders) &&
    settings.minOrders >= 1 &&
    Number.isInteger(settings.lowOrders) &&
    settings.lowOrders >= settings.minOrders
  );
}

/** Two regions' own values are the same choice (a missing region sets nothing). */
export function sameRegion(
  a: RegionWalletSettings | undefined,
  b: RegionWalletSettings | undefined,
): boolean {
  const x = a ?? {};
  const y = b ?? {};
  return x.enforced === y.enforced && x.minOrders === y.minOrders && x.lowOrders === y.lowOrders;
}

/**
 * The config to write when this page's `draft` was edited from `base` while the server moved
 * on to `latest` (another admin saved meanwhile). Config `driverWallet` is written whole, so a
 * plain save would silently undo their edits; instead only what this page changed — each
 * global value, each region — is laid over `latest`, and everything else stays theirs. When
 * both touched the same value, this save wins, as it would have anyway.
 */
export function mergeWalletConfig(
  base: WalletConfig,
  draft: WalletConfig,
  latest: WalletConfig,
): WalletConfig {
  const next: WalletConfig = { ...latest, regions: { ...latest.regions } };
  if (draft.enforced !== base.enforced) next.enforced = draft.enforced;
  if (draft.minOrders !== base.minOrders) next.minOrders = draft.minOrders;
  if (draft.lowOrders !== base.lowOrders) next.lowOrders = draft.lowOrders;

  const ids = new Set([...Object.keys(base.regions), ...Object.keys(draft.regions)]);
  for (const id of ids) {
    if (sameRegion(base.regions[id], draft.regions[id])) continue;
    if (draft.regions[id]) next.regions[id] = draft.regions[id];
    else delete next.regions[id];
  }
  return next;
}
