import type { Driver } from '@/types/driver';
import type { WalletSettings, WalletSummary } from '@/types/wallet';

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
 * Drivers online right now whom the gate would refuse — what turning enforcement on, or
 * raising the minimum, would take offline at their next delivery. The server only checks
 * when a driver goes online, so these keep their current session.
 */
export function onlineWithoutEnough(
  drivers: readonly Driver[],
  wallets: ReadonlyMap<string, WalletSummary>,
  settings: Pick<WalletSettings, 'minOrders'>,
): Driver[] {
  return drivers.filter((driver) => {
    if (driver.driverActive !== true || driver.enabled === false) return false;
    const units = wallets.get(driver.objectId)?.units ?? 0;
    return units < settings.minOrders * UNITS_PER_ORDER;
  });
}
