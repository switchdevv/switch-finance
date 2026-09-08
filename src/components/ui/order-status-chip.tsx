import { Chip } from '@heroui/react';
import type { DeliveryType } from '@/types/order';

/**
 * An order's state is two fields, not one: `canceled` is a separate boolean that
 * overrides `status` entirely, and the labels for statuses 2 and 3 depend on whether the
 * order is delivered or collected. Both quirks are the backend's
 * (switch-food/src/configs/index.js:80-96) and are resolved here, once, so no screen has
 * to remember that "3" means two different words.
 */
const DELIVERY_LABELS = ['Placed', 'Confirmed', 'On the way', 'Delivered'];
const PICKUP_LABELS = ['Placed', 'Confirmed', 'Ready for pickup', 'Picked up'];

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
  if (canceled) {
    return (
      <Chip color="danger" variant="soft" size={size} className="gap-1.5 ps-2">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
        <Chip.Label>Canceled</Chip.Label>
      </Chip>
    );
  }

  const labels = deliveryType === 'pickup' ? PICKUP_LABELS : DELIVERY_LABELS;
  const index = status !== undefined && status >= 0 && status < labels.length ? status : undefined;

  return (
    <Chip
      color={index === undefined ? 'default' : COLORS[index]}
      variant="soft"
      size={size}
      className="gap-1.5 ps-2"
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      <Chip.Label>{index === undefined ? 'Unknown' : labels[index]}</Chip.Label>
    </Chip>
  );
}
