import { Chip } from '@heroui/react';
import { ROLE_LABELS, type FinanceRole } from '@/lib/auth/access';

const STATES = {
  admin: { color: 'accent', label: ROLE_LABELS.admin },
  member: { color: 'success', label: ROLE_LABELS.member },
  none: { color: 'default', label: ROLE_LABELS.none },
} as const;

/**
 * An account's finance role, as one chip. Same construction as StatusChip: a `soft`
 * tinted fill so a column of these can be scanned without reading every label, plus a dot
 * that repeats the signal for anyone who can't separate the hues.
 */
export function RoleChip({ role, size = 'md' }: { role: FinanceRole; size?: 'sm' | 'md' | 'lg' }) {
  const state = role === 'admin' ? STATES.admin : role === 'member' ? STATES.member : STATES.none;

  return (
    <Chip color={state.color} variant="soft" size={size} className="gap-1.5 ps-2">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      <Chip.Label>{state.label}</Chip.Label>
    </Chip>
  );
}
