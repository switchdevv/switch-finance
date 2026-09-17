'use client';

import { Chip } from '@heroui/react';
import { useI18n } from '@/lib/i18n/provider';

const COLORS = { live: 'success', paused: 'warning', unapproved: 'default' } as const;

/**
 * Restaurant has two independent boolean flags that are easy to conflate:
 * `enabled` is the platform/admin's approval, `active` is the manager's own
 * pause/resume toggle. This is the one place that decision gets made, so every
 * screen shows the same three states consistently.
 */
export function StatusChip({
  enabled,
  active,
  size = 'md',
}: {
  enabled: boolean | undefined;
  active: boolean | undefined;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { t } = useI18n();
  const state = !enabled ? 'unapproved' : !active ? 'paused' : 'live';

  return (
    // `soft` rather than the default grey fill: three statuses that differ only by
    // label colour are hard to scan down a column, and the tinted background does
    // the sorting for the eye before the text is read. The dot carries the same
    // signal again for anyone who can't separate the hues.
    <Chip color={COLORS[state]} variant="soft" size={size} className="gap-1.5 ps-2">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      <Chip.Label>{t(`restaurants.status.${state}`)}</Chip.Label>
    </Chip>
  );
}
