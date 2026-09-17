'use client';

import { Chip } from '@heroui/react';
import { roleKey, type FinanceRole } from '@/lib/auth/access';
import { useI18n } from '@/lib/i18n/provider';

const COLORS = { admin: 'accent', member: 'success', none: 'default' } as const;

/**
 * An account's finance role, as one chip. Same construction as StatusChip: a `soft`
 * tinted fill so a column of these can be scanned without reading every label, plus a dot
 * that repeats the signal for anyone who can't separate the hues.
 */
export function RoleChip({ role, size = 'md' }: { role: FinanceRole; size?: 'sm' | 'md' | 'lg' }) {
  const { t } = useI18n();
  const color = COLORS[role ?? 'none'];

  return (
    <Chip color={color} variant="soft" size={size} className="gap-1.5 ps-2">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      <Chip.Label>{t(roleKey(role))}</Chip.Label>
    </Chip>
  );
}
