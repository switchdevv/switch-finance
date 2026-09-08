'use client';

import { useEffect } from 'react';
import { Alert, Button, Skeleton, Table } from '@heroui/react';
import { ORDER_PAGE_SIZE, useOrders, useOrdersCount } from '@/hooks/use-orders';
import type { OrderScope } from '@/lib/services/orders';
import type { DateRange } from '@/lib/finance/date-range';
import { formatDate, formatMoney, formatOrNone, formatTime, shortId } from '@/lib/format';
import { parseErrorMessage } from '@/lib/parse/errors';
import type { CurrencyCode } from '@/types/city';
import type { OrderWithUser } from '@/types/order';
import { OrderStatusChip } from '@/components/ui/order-status-chip';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { BagIcon, BikeIcon, ReceiptIcon } from '@/components/icons';

const COLUMNS = [
  { key: 'id', label: 'Order', className: 'w-[7rem] text-start' },
  { key: 'placed', label: 'Placed', className: 'w-[9rem] text-start' },
  { key: 'customer', label: 'Customer', className: 'min-w-[10rem] text-start' },
  { key: 'type', label: 'Type', className: 'w-[7rem] text-start' },
  { key: 'status', label: 'Status', className: 'w-[9.5rem] text-start' },
  { key: 'items', label: 'Items', className: 'w-[8rem] text-end' },
  { key: 'discount', label: 'Discount', className: 'w-[8rem] text-end' },
  { key: 'total', label: 'Total', className: 'w-[9rem] text-end' },
] as const;

export function OrdersTable({
  restaurantId,
  range,
  scope,
  currency,
  page,
  onPageChange,
}: {
  restaurantId: string;
  range: DateRange;
  scope: OrderScope;
  currency: CurrencyCode | undefined;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const query = { restaurantId, range, scope };
  const rowsQuery = useOrders(query, page);
  const countQuery = useOrdersCount(query);

  const totalPages =
    countQuery.status === 'success'
      ? Math.max(1, Math.ceil(countQuery.data / ORDER_PAGE_SIZE))
      : null;

  // Changing the range or the scope can shrink the result set under a page the user is
  // already on; without this they'd be left staring at an empty grid with no clue why.
  useEffect(() => {
    if (totalPages !== null && page > totalPages) onPageChange(totalPages);
  }, [totalPages, page, onPageChange]);

  if (rowsQuery.status === 'pending') return <TableSkeleton />;

  if (rowsQuery.status === 'error') {
    return (
      <Alert status="danger">
        <Alert.Content>
          <Alert.Title>Couldn&apos;t load orders</Alert.Title>
          <Alert.Description>{parseErrorMessage(rowsQuery.error, 'fetch')}</Alert.Description>
        </Alert.Content>
        <Button variant="secondary" size="sm" onPress={() => rowsQuery.refetch()}>
          Retry
        </Button>
      </Alert>
    );
  }

  const rows = rowsQuery.data;

  return (
    <>
      {rows.length === 0 ? (
        <EmptyRows scope={scope} />
      ) : (
        <Table variant="secondary" className="px-3 pb-1">
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Orders"
              className={
                'min-w-[62rem] ' +
                (rowsQuery.isPlaceholderData ? 'opacity-50 transition-opacity' : 'transition-opacity')
              }
            >
              <Table.Header>
                {COLUMNS.map((column) => (
                  <Table.Column
                    key={column.key}
                    isRowHeader={column.key === 'id'}
                    className={`text-micro tracking-[0.12em] uppercase ${column.className}`}
                  >
                    {column.label}
                  </Table.Column>
                ))}
              </Table.Header>
              <Table.Body items={rows}>
                {(order: OrderWithUser) => (
                  <Table.Row id={order.objectId}>
                    <Table.Cell className="whitespace-nowrap">
                      {/* The tail of the objectId, which is the order number on this
                          backend — the full string is title-attributed for anyone who
                          needs to paste it into Parse. */}
                      <span className="text-caption tabular font-bold" title={order.objectId}>
                        #{shortId(order.objectId)}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">
                      <span className="text-body tabular block">{formatDate(order.createdAt)}</span>
                      <span className="text-caption text-muted tabular block">
                        {formatTime(order.createdAt)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-body block truncate">
                        {formatOrNone(order.user?.fullname)}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">
                      <TypeCell deliveryType={order.deliveryType} />
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">
                      <OrderStatusChip
                        status={order.status}
                        canceled={order.canceled}
                        deliveryType={order.deliveryType}
                      />
                    </Table.Cell>
                    <Table.Cell className="text-end whitespace-nowrap">
                      <span className="text-body tabular">
                        {formatMoney(order.options?.itemsTotal, currency)}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="text-end whitespace-nowrap">
                      <span className="text-body tabular text-[var(--danger)]">
                        {order.options?.discount
                          ? `−${formatMoney(order.options.discount, currency)}`
                          : '—'}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="text-end whitespace-nowrap">
                      <span className="text-body tabular font-bold">
                        {formatMoney(
                          (order.options?.itemsTotal ?? 0) - (order.options?.discount ?? 0),
                          currency,
                        )}
                      </span>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

      <PaginationBar
        page={page}
        totalPages={totalPages}
        hasNext={rows.length === ORDER_PAGE_SIZE}
        isFetching={rowsQuery.isFetching}
        onChange={onPageChange}
      />
    </>
  );
}

function TypeCell({ deliveryType }: { deliveryType: string | undefined }) {
  const isPickup = deliveryType === 'pickup';
  const Icon = isPickup ? BagIcon : BikeIcon;

  return (
    <span className="text-caption text-muted flex items-center gap-1.5">
      <Icon className="size-4" />
      {isPickup ? 'Pickup' : 'Delivery'}
    </span>
  );
}

function EmptyRows({ scope }: { scope: OrderScope }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <span className="bg-surface-secondary text-muted mb-2 grid size-12 place-items-center rounded-2xl">
        <ReceiptIcon className="size-6" />
      </span>
      <p className="text-h6 font-bold">No orders in this period</p>
      <p className="text-muted text-body">
        {scope === 'billable'
          ? 'Nothing billable was placed in the selected dates. Switch to All orders to include canceled and in-progress ones.'
          : 'Nothing was placed in the selected dates.'}
      </p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col px-5 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-separator/50 flex items-center gap-4 border-b py-3.5 last:border-b-0">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-4 flex-1 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-pill" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}
