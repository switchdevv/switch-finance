import { Chip } from '@heroui/react';
import { orderState, orderStateKey } from '@/lib/finance/order-status';
import { useI18n } from '@/lib/i18n/provider';
import type { DeliveryType } from '@/types/order';

/** Which state means what is decided in lib/finance/order-status.ts, shared with the
 * spreadsheet; this only picks the colour. */

const COLORS = ['warning', 'accent', 'accent', 'success'] as const;

export function OrderStatusChip({
  status,
  canceled,
  deliveryType,
  size = 'sm',
}: {
  status: number | undefined;
  canceled: boolean | undefined;
  deliveryType: DeliveryType | undefined;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { t } = useI18n();
  const { state, step } = orderState({ status, canceled, deliveryType });
  const color = state === 'canceled' ? 'danger' : step === undefined ? 'default' : COLORS[step];

  return (
    <Chip
      color={color}
      variant="soft"
      size={size}
      className="gap-1.5 ps-2"
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      <Chip.Label>{t(orderStateKey(state))}</Chip.Label>
    </Chip>
  );
}
