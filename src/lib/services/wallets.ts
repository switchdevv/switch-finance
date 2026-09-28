import { callFunction } from '@/lib/parse/mutate';
import type {
  TopUpMethod,
  WalletDetail,
  WalletList,
  WalletSettings,
  WalletWriteResult,
} from '@/types/wallet';

/**
 * Drivers' wallets, all through switch-server-v2's wallet functions (D-25). The wallets live
 * in server-only collections, so there is nothing to query directly; every figure — the
 * balance, what it is worth, what a refund pays — is computed there, once. Spec:
 * docs/driver-wallet-backend.md.
 *
 * Every recording call carries a `requestId` made when its dialog opened: the server keys
 * the entry by it, so a retried click is recorded once.
 */

export function listDriverWallets(): Promise<WalletList> {
  return callFunction<WalletList>('listDriverWallets');
}

/** `from`/`to` are the period's first and last instants, as ISO strings. */
export function getDriverWallet(
  driverId: string,
  range: { from: string; to: string },
): Promise<WalletDetail> {
  return callFunction<WalletDetail>('getDriverWallet', { driverId, ...range });
}

export type TopUpInput = {
  driverId: string;
  orders: number;
  method: TopUpMethod;
  reference?: string;
  note?: string;
  /** Only read when the driver has no wallet yet: their deliveries count from here. */
  startsAt?: string;
  requestId: string;
};

export function recordTopUp(input: TopUpInput): Promise<WalletWriteResult> {
  return callFunction<WalletWriteResult>('recordWalletTopUp', input);
}

export type RefundInput = {
  driverId: string;
  /** Omitted: every order left. */
  orders?: number;
  close?: boolean;
  note?: string;
  requestId: string;
};

export function recordRefund(input: RefundInput): Promise<WalletWriteResult> {
  return callFunction<WalletWriteResult>('recordWalletRefund', input);
}

/** What a refund would pay back, computed by the server exactly as recording it would —
 * the oldest orders first, each at its own price — and recorded nowhere. */
export async function previewRefund(input: {
  driverId: string;
  orders?: number;
}): Promise<{ units: number; amount: number }> {
  const result = await callFunction<{ preview: { units: number; amount: number } }>(
    'recordWalletRefund',
    { ...input, dryRun: true },
  );
  return result.preview;
}

export type AdjustmentInput = {
  driverId: string;
  /** Positive adds, negative takes away (the oldest first). */
  orders: number;
  reason: string;
  /** Adds only: DA per order, today's fee when omitted, 0 for orders with no cash value. */
  unitPrice?: number;
  requestId: string;
};

export function recordAdjustment(input: AdjustmentInput): Promise<WalletWriteResult> {
  return callFunction<WalletWriteResult>('recordWalletAdjustment', input);
}

export function voidEntry(input: { entryId: string; reason: string }): Promise<WalletWriteResult> {
  return callFunction<WalletWriteResult>('voidWalletEntry', input);
}

/**
 * Writes Config `driverWallet` through the admin-only `updateConfigs`, which merges key by
 * key — so only this key is sent, and no other Config value can be overwritten by it.
 */
export function saveWalletSettings(settings: WalletSettings): Promise<unknown> {
  return callFunction('updateConfigs', { configs: { driverWallet: settings } });
}

/** A fresh request id for one recording (see above). */
export function newRequestId(): string {
  return crypto.randomUUID();
}
