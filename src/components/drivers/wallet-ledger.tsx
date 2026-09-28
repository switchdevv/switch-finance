'use client';

import { Button, Chip, Table } from '@heroui/react';
import { shortId } from '@/lib/format';
import type { MessageKey } from '@/lib/i18n/dictionary';
import { useI18n } from '@/lib/i18n/provider';
import type { CurrencyCode } from '@/types/city';
import type { LedgerEntryLine, LedgerLine, WalletLedger } from '@/types/wallet';
import { BanIcon, FilterIcon } from '@/components/icons';

const COLUMNS = [
  { key: 'date', className: 'w-[9rem] text-start' },
  { key: 'movement', className: 'min-w-[16rem] text-start' },
  { key: 'orders', className: 'w-[7rem] text-end' },
  { key: 'price', className: 'w-[7rem] text-end' },
  { key: 'amount', className: 'w-[8rem] text-end' },
  { key: 'balance', className: 'w-[7rem] text-end' },
] as const;

/** The delivery statuses (a driver's orders are deliveries), as orders.status keys. */
const STATUS_KEYS = ['placed', 'confirmed', 'onTheWay', 'delivered'] as const;

/**
 * A wallet's movements over the period, newest first, each with the balance after it —
 * the manual entries (top-ups, refunds, adjustments), the driver's deliveries, and the
 * notes the server leaves when staff change a delivered order. Every figure is the
 * server's (switch-server-v2 D-25).
 */
export function WalletLedgerTable({
  ledger,
  currency,
  isStale,
  canVoid,
  driverNames,
  onVoid,
}: {
  ledger: WalletLedger;
  currency: CurrencyCode | undefined;
  isStale: boolean;
  canVoid: boolean;
  /** For "handed from A to B" notes. */
  driverNames: ReadonlyMap<string, string>;
  onVoid: (entry: LedgerEntryLine) => void;
}) {
  const { t, format } = useI18n();

  if (ledger.lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <span className="bg-surface-secondary text-muted mb-2 grid size-12 place-items-center rounded-2xl">
          <FilterIcon className="size-6" />
        </span>
        <p className="text-h6 font-bold">{t('wallet.ledger.emptyTitle')}</p>
        <p className="text-muted text-body">
          {t('wallet.ledger.opening', { orders: format.orders(ledger.range.openingUnits) })}
        </p>
      </div>
    );
  }

  return (
    <>
      <Table variant="secondary" className="px-3 pb-1">
        <Table.ScrollContainer>
          <Table.Content
            aria-label={t('wallet.ledger.tableLabel')}
            className={
              'min-w-[56rem] ' + (isStale ? 'opacity-50 transition-opacity' : 'transition-opacity')
            }
          >
            <Table.Header>
              {COLUMNS.map((column) => (
                <Table.Column
                  key={column.key}
                  isRowHeader={column.key === 'movement'}
                  className={`text-micro tracking-[0.12em] uppercase ${column.className}`}
                >
                  {t(`wallet.ledger.columns.${column.key}`)}
                </Table.Column>
              ))}
              <Table.Column className="w-12">
                <span className="sr-only">{t('wallet.ledger.columns.actions')}</span>
              </Table.Column>
            </Table.Header>
            {/* Rows are cached by item; names and the void button come from outside them. */}
            <Table.Body items={ledger.lines} dependencies={[driverNames, canVoid, currency]}>
              {(line: LedgerLine) => {
                const struck = line.type === 'entry' && line.voided ? 'line-through opacity-60' : '';
                return (
                  <Table.Row id={`${line.type}:${line.id}`}>
                    <Table.Cell className="whitespace-nowrap">
                      <span className="text-body tabular block">{format.date(line.at)}</span>
                      <span className="text-caption text-muted tabular block">
                        {format.time(line.at)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <Movement line={line} driverNames={driverNames} />
                    </Table.Cell>
                    <Table.Cell className="text-end whitespace-nowrap">
                      <OrdersFigure line={line} className={struck} />
                    </Table.Cell>
                    <Table.Cell className="text-end whitespace-nowrap">
                      <span className={`tabular text-muted ${struck}`}>
                        {priceOf(line) === null ? '—' : format.money(priceOf(line), currency)}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="text-end whitespace-nowrap">
                      <AmountFigure line={line} currency={currency} className={struck} />
                    </Table.Cell>
                    <Table.Cell className="text-end whitespace-nowrap">
                      <span
                        className={`tabular font-bold ${line.balanceAfter < 0 ? 'text-[var(--danger)]' : ''}`}
                      >
                        {format.orders(line.balanceAfter)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      {canVoid &&
                        line.type === 'entry' &&
                        line.kind !== 'orderChange' &&
                        !line.voided && (
                          <Button
                            variant="ghost"
                            size="sm"
                            isIconOnly
                            aria-label={t('wallet.actions.void')}
                            onPress={() => onVoid(line)}
                          >
                            <BanIcon className="size-4" />
                          </Button>
                        )}
                    </Table.Cell>
                  </Table.Row>
                );
              }}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      <p className="text-caption text-muted tabular border-separator/70 border-t px-5 py-3">
        {t('wallet.ledger.opening', { orders: format.orders(ledger.range.openingUnits) })}
        {ledger.truncated &&
          ` · ${t('wallet.ledger.truncated', { count: format.number(ledger.lines.length) })}`}
      </p>
    </>
  );
}

function priceOf(line: LedgerLine): number | null {
  if (line.type === 'order') return line.price || null;
  if (line.kind === 'topup' || (line.kind === 'adjustment' && line.units > 0)) return line.unitPrice;
  return null;
}

function Movement({
  line,
  driverNames,
}: {
  line: LedgerLine;
  driverNames: ReadonlyMap<string, string>;
}) {
  const { t } = useI18n();

  if (line.type === 'order') {
    const key: MessageKey =
      line.units > 0 ? 'wallet.ledger.kinds.credit' : 'wallet.ledger.kinds.order';
    return (
      <span className="flex flex-col">
        <span className="text-body font-bold">{t(key, { id: shortId(line.id) })}</span>
        {line.freeDelivery && (
          <span className="text-caption text-muted">{t('wallet.ledger.freeDeliveryHint')}</span>
        )}
      </span>
    );
  }

  const details = [
    line.method && t(`wallet.methods.${line.method}`),
    line.reference,
    line.note,
  ].filter(Boolean);

  return (
    <span className="flex flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-2">
        <span className={`text-body font-bold ${line.voided ? 'line-through opacity-60' : ''}`}>
          {line.order
            ? t('wallet.ledger.kinds.orderChange', { id: shortId(line.order.id) })
            : t(`wallet.ledger.kinds.${line.kind}`)}
        </span>
        {line.voided && (
          <Chip color="danger" variant="soft" size="sm">
            <Chip.Label>{t('wallet.ledger.voidedChip')}</Chip.Label>
          </Chip>
        )}
      </span>
      {line.order && (
        <span className="text-caption text-muted">
          <OrderChange order={line.order} driverNames={driverNames} />
        </span>
      )}
      {details.length > 0 && (
        <span className="text-caption text-muted">{details.join(' · ')}</span>
      )}
      <span className="text-caption text-muted">
        {t('wallet.ledger.by', { name: line.by.name ?? '—' })}
      </span>
      {line.voided && (
        <span className="text-caption text-[var(--danger)]">
          {t('wallet.ledger.voided', {
            name: line.voided.by.name ?? '—',
            reason: line.voided.reason,
          })}
        </span>
      )}
    </span>
  );
}

function OrderChange({
  order,
  driverNames,
}: {
  order: NonNullable<LedgerEntryLine['order']>;
  driverNames: ReadonlyMap<string, string>;
}) {
  const { t } = useI18n();
  const status = (value: unknown) =>
    typeof value === 'number' && value >= 0 && value < STATUS_KEYS.length
      ? t(`orders.status.${STATUS_KEYS[value]}`)
      : String(value ?? '—');
  const driver = (value: unknown) =>
    typeof value === 'string'
      ? (driverNames.get(value) ?? shortId(value))
      : t('wallet.ledger.changes.nobody');

  switch (order.change) {
    case 'status':
      return <>{t('wallet.ledger.changes.status', { from: status(order.from), to: status(order.to) })}</>;
    case 'canceled':
      return <>{order.to ? t('wallet.ledger.changes.canceled') : t('wallet.ledger.changes.uncanceled')}</>;
    case 'reassigned':
      return (
        <>{t('wallet.ledger.changes.reassigned', { from: driver(order.from), to: driver(order.to) })}</>
      );
    case 'money':
      return <>{t('wallet.ledger.changes.money')}</>;
    case 'deleted':
      return <>{t('wallet.ledger.changes.deleted')}</>;
  }
}

function OrdersFigure({ line, className }: { line: LedgerLine; className: string }) {
  const { t, format } = useI18n();
  const signed = (units: number) => `${units > 0 ? '+' : ''}${format.orders(units)}`;

  if (line.type === 'entry' && line.kind === 'orderChange') {
    // A note: the change is already in the balance through the order's own line.
    const effect = line.order?.effect ?? 0;
    return (
      <span className="text-caption text-muted tabular">
        {effect === 0
          ? t('wallet.ledger.effect.none')
          : effect > 0
            ? t('wallet.ledger.effect.returned', { orders: signed(effect) })
            : t('wallet.ledger.effect.taken', { orders: signed(effect) })}
      </span>
    );
  }
  const tone =
    line.units > 0 ? 'text-[var(--success)]' : line.units < 0 ? '' : 'text-muted';
  return (
    <span className={`tabular font-bold ${tone} ${className}`}>{signed(line.units)}</span>
  );
}

function AmountFigure({
  line,
  currency,
  className,
}: {
  line: LedgerLine;
  currency: CurrencyCode | undefined;
  className: string;
}) {
  const { format } = useI18n();
  if (line.type === 'order' || line.kind === 'orderChange' || !line.amount) {
    return <span className="text-muted">—</span>;
  }
  // Received for a top-up; handed back for a refund; an adjustment's value is not cash.
  const sign = line.kind === 'topup' ? '+' : line.kind === 'refund' ? '−' : '';
  const tone = line.kind === 'adjustment' ? 'text-muted' : 'font-bold';
  return (
    <span className={`tabular ${tone} ${className}`}>
      {sign}
      {format.money(line.amount, currency)}
    </span>
  );
}
