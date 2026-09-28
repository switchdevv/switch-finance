'use client';

import { Chip } from '@heroui/react';
import type { DriverWalletState } from '@/lib/finance/wallet';
import { useI18n } from '@/lib/i18n/provider';

const COLORS = {
  ok: 'success',
  low: 'warning',
  empty: 'danger',
  none: 'default',
  closed: 'default',
} as const;

/**
 * A wallet's state as one chip, built like StatusChip: a tinted fill to scan a column by,
 * and a dot repeating the signal for anyone who can't separate the hues. With `orders`, the
 * chip carries the count too ("12 orders"), which is what a finance user looks for first.
 */
export function WalletStateChip({
  state,
  ordersLeft,
  size = 'md',
}: {
  state: DriverWalletState;
  ordersLeft?: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { t, tCount, format } = useI18n();
  const label =
    ordersLeft !== undefined && state !== 'none' && state !== 'closed'
      ? tCount('wallet.orders', ordersLeft, { count: format.number(ordersLeft) })
      : t(`wallet.state.${state}`);

  return (
    <Chip color={COLORS[state]} variant="soft" size={size} className="gap-1.5 ps-2">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  );
}
