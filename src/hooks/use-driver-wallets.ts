'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DateRange } from '@/lib/finance/date-range';
import { queryKeys } from '@/lib/query/keys';
import {
  getDriverWallet,
  listDriverWallets,
  previewRefund,
  recordAdjustment,
  recordRefund,
  recordTopUp,
  saveWalletSettings,
  voidEntry,
} from '@/lib/services/wallets';

/** Every wallet, with the settings. A missed invalidation costs at most a minute. */
export function useDriverWallets() {
  return useQuery({
    queryKey: queryKeys.wallets.list(),
    queryFn: listDriverWallets,
    staleTime: 60_000,
  });
}

/** One wallet and its ledger for the period on screen. */
export function useDriverWallet(driverId: string, range: DateRange) {
  const instants = { from: range.start.toISOString(), to: range.end.toISOString() };
  return useQuery({
    queryKey: queryKeys.wallets.detail(driverId, instants),
    queryFn: () => getDriverWallet(driverId, instants),
    enabled: driverId.length > 0,
    // The summary above the ledger doesn't depend on the period: keep it on screen while
    // another period loads (the ledger dims meanwhile).
    placeholderData: keepPreviousData,
  });
}

/**
 * One recording mutation. Whatever it is, every wallet figure on screen may have moved —
 * the list's, the summary's, the ledger's — so all of them are re-read.
 */
function useWalletMutation<Input>(fn: (input: Input) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.wallets.all }),
  });
}

export const useTopUp = () => useWalletMutation(recordTopUp);
export const useRefund = () => useWalletMutation(recordRefund);
export const useAdjustment = () => useWalletMutation(recordAdjustment);
export const useVoidEntry = () => useWalletMutation(voidEntry);
export const useSaveWalletSettings = () => useWalletMutation(saveWalletSettings);

/** The server's figure for a refund being prepared; re-asked as the count changes. */
export function useRefundPreview(driverId: string, orders: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.wallets.refundPreview(driverId, orders ?? null),
    queryFn: () => previewRefund({ driverId, orders }),
    enabled,
    // A preview is only as good as the moment it was asked; never serve an old one.
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
