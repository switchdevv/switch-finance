'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Button, Skeleton, Table, Tooltip, useOverlayState } from '@heroui/react';
import { useDriverOrdersInRange } from '@/hooks/use-driver-orders';
import { exportDriverWorkbook } from '@/lib/export/driver-sheet';
import type { DriverFieldKey } from '@/lib/export/driver-fields';
import { hasCarryOver, NO_CARRY_OVER, type CarryOver } from '@/lib/finance/carry-over';
import { businessDay, daysIn, type DateRange, type RangePreset } from '@/lib/finance/date-range';
import {
  balanceOf,
  byDay,
  earningOf,
  isCash,
  isDelivered,
  serviceOf,
  settle,
  settlementDue,
  type DriverSettlement,
  type SettlementDue,
} from '@/lib/finance/driver-settlement';
import {
  defaultStatementOptions,
  signedMoney,
  type StatementMode,
  type StatementOptions,
} from '@/lib/invoice/driver-statement';
import { shortId } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';
import { parseErrorKey } from '@/lib/parse/errors';
import { driverStatementHref } from '@/lib/url/routes';
import type { CurrencyCode } from '@/types/city';
import type { DriverOrder } from '@/types/order';
import { DateRangeToolbar } from '@/components/ui/date-range-toolbar';
import { OrderStatusChip } from '@/components/ui/order-status-chip';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatTile } from '@/components/ui/stat-tile';
import { DriverExportModal, DriverStatementModal } from '@/components/drivers/driver-export-dialogs';
import {
  BikeIcon,
  ChartIcon,
  PrinterIcon,
  ReceiptIcon,
  SheetIcon,
  WalletIcon,
} from '@/components/icons';

const PAGE_SIZE = 25;

export type FinanceScope = 'delivered' | 'all';
const SCOPES: readonly FinanceScope[] = ['delivered', 'all'];

/**
 * A driver's money for a period: what they delivered and earned, what they collected in cash
 * and still hold for Switch, what Switch owes them back — and so who owes whom, how much of
 * it the prepaid wallet already settled, and the orders behind every figure. The period is
 * the page's (`?range=&from=&to=`, shared with the Wallet tab); the table's scope and page are
 * `?fscope=` and `?fpage=`.
 *
 * Every rule is in lib/finance/driver-settlement.ts; this only lays the figures out.
 */
export function DriverFinance({
  driverId,
  driverName,
  currency,
  range,
  walletStartsAt,
  scope,
  page,
  onPresetChange,
  onCustomChange,
  onScopeChange,
  onPageChange,
}: {
  driverId: string;
  driverName: string;
  currency: CurrencyCode | undefined;
  range: DateRange;
  /** When the driver's wallet started counting; null without one. */
  walletStartsAt: string | null;
  scope: FinanceScope;
  page: number;
  onPresetChange: (preset: RangePreset) => void;
  onCustomChange: (from: string, to: string) => void;
  onScopeChange: (scope: FinanceScope) => void;
  onPageChange: (page: number) => void;
}) {
  const { t, tCount, format } = useI18n();
  const exportDialog = useOverlayState();
  const statementDialog = useOverlayState();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [statementOptions, setStatementOptions] = useState<StatementOptions>(defaultStatementOptions);

  const query = useDriverOrdersInRange(driverId, range);
  const isPending = query.status === 'pending' || query.isPlaceholderData;
  const all = useMemo(() => query.data?.orders ?? [], [query.data]);
  const delivered = useMemo(() => all.filter(isDelivered), [all]);
  const settlement = useMemo(() => settle(all), [all]);
  const due = useMemo(() => settlementDue(delivered, walletStartsAt), [delivered, walletStartsAt]);
  const days = useMemo(() => byDay(delivered, daysIn(range), businessDay), [delivered, range]);

  // Read oldest-first (the sheet's order); the table shows the newest first.
  const rowsNewestFirst = useMemo(
    () => [...(scope === 'delivered' ? delivered : all)].reverse(),
    [scope, delivered, all],
  );
  const totalPages = Math.max(1, Math.ceil(rowsNewestFirst.length / PAGE_SIZE));
  const tablePage = Math.min(page, totalPages);
  const pageRows = rowsNewestFirst.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE);

  const onExport = async (fields: DriverFieldKey[], carryOver: CarryOver) => {
    if (!query.data) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await exportDriverWorkbook({
        t,
        tCount,
        format,
        driverName,
        range,
        orders: delivered,
        settlement,
        due: settlementDue(delivered, walletStartsAt, hasCarryOver(carryOver) ? carryOver.amount : 0),
        walletStartsAt,
        currency,
        truncated: query.data.truncated,
        fields,
        carryOver,
      });
      exportDialog.close();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsExporting(false);
    }
  };

  const onOpenStatement = (options: StatementOptions, mode: StatementMode) => {
    setStatementOptions({ ...options, carryOver: NO_CARRY_OVER });
    statementDialog.close();
    window.open(driverStatementHref(driverId, range, mode, options), '_blank', 'noopener');
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="border-border/70 bg-surface rounded-card shadow-card flex flex-wrap items-center justify-between gap-4 border px-5 py-4">
        <DateRangeToolbar range={range} onPresetChange={onPresetChange} onCustomChange={onCustomChange} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onPress={exportDialog.open}
            isDisabled={isPending || isExporting || settlement.delivered === 0}
          >
            <SheetIcon className="size-4" />
            {isExporting ? t('common.preparing') : t('report.excel')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={statementDialog.open}
            isDisabled={isPending || settlement.delivered === 0}
          >
            <PrinterIcon className="size-4" />
            {t('driverFinance.statement')}
          </Button>
        </div>
      </section>

      {query.status === 'error' && (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>{t('driverFinance.loadError')}</Alert.Title>
            <Alert.Description>{t(parseErrorKey(query.error, 'fetch'))}</Alert.Description>
          </Alert.Content>
          <Button variant="secondary" size="sm" onPress={() => query.refetch()}>
            {t('common.retry')}
          </Button>
        </Alert>
      )}

      {exportError && (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>{t('driverFinance.exportError')}</Alert.Title>
            <Alert.Description>{exportError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {!query.isPlaceholderData && query.data?.truncated && (
        <Alert status="warning">
          <Alert.Content>
            <Alert.Title>{t('report.truncatedTitle')}</Alert.Title>
            <Alert.Description>
              {t('report.truncatedBody', { count: format.number(query.data.orders.length) })}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={BikeIcon}
          label={t('driverFinance.tiles.deliveries')}
          value={format.number(settlement.delivered)}
          hint={t('driverFinance.tiles.deliveriesHint', {
            cash: format.number(settlement.cash),
            card: format.number(settlement.card),
          })}
          isPending={isPending}
        />
        <StatTile
          icon={ChartIcon}
          label={t('driverFinance.tiles.earnings')}
          value={format.money(settlement.earnings, currency)}
          hint={t('driverFinance.tiles.earningsHint', {
            amount: format.money(Math.round(settlement.averageEarning), currency),
          })}
          isPending={isPending}
        />
        <StatTile
          icon={ReceiptIcon}
          label={t('driverFinance.tiles.serviceHeld')}
          value={format.money(settlement.serviceHeld, currency)}
          hint={t('driverFinance.tiles.serviceHeldHint', {
            amount: format.money(settlement.cashCollected, currency),
          })}
          isPending={isPending}
        />
        <StatTile
          icon={WalletIcon}
          label={t('driverFinance.tiles.balance')}
          value={format.money(Math.abs(settlement.net), currency)}
          hint={
            settlement.net > 0
              ? t('driverFinance.tiles.driverOwes')
              : settlement.net < 0
                ? t('driverFinance.tiles.switchOwes')
                : t('driverFinance.tiles.even')
          }
          isPending={isPending}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Breakdown settlement={settlement} due={due} walletStartsAt={walletStartsAt} currency={currency} isPending={isPending} />
        <Activity settlement={settlement} currency={currency} isPending={isPending} />
      </div>

      <DailyChart days={days} currency={currency} isPending={isPending} />

      <section className="border-border/70 bg-surface rounded-card shadow-card overflow-hidden border">
        <header className="border-separator/70 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex flex-col">
            <h2 className="text-h6 font-bold">{t('driverFinance.ordersTitle')}</h2>
            {rowsNewestFirst.length > 0 && (
              <span className="text-caption text-muted tabular">
                {t('common.showingOf', {
                  start: format.number((tablePage - 1) * PAGE_SIZE + 1),
                  end: format.number(Math.min(tablePage * PAGE_SIZE, rowsNewestFirst.length)),
                  total: format.number(rowsNewestFirst.length),
                })}
              </span>
            )}
          </div>
          <SegmentedControl
            label={t('report.scopeLabel')}
            options={SCOPES.map((key) => ({ key, label: t(`driverFinance.scopes.${key}`) }))}
            value={scope}
            onChange={onScopeChange}
          />
        </header>

        {query.status === 'pending' ? (
          <div className="flex flex-col gap-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : pageRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <span className="bg-surface-secondary text-muted mb-2 grid size-12 place-items-center rounded-2xl">
              <ReceiptIcon className="size-6" />
            </span>
            <p className="text-h6 font-bold">{t('driverFinance.emptyTitle')}</p>
            <p className="text-muted text-body">
              {scope === 'delivered' ? t('driverFinance.emptyDelivered') : t('driverFinance.emptyAll')}
            </p>
          </div>
        ) : (
          <OrdersTable orders={pageRows} currency={currency} walletStartsAt={walletStartsAt} isStale={query.isPlaceholderData} />
        )}

        <PaginationBar
          page={tablePage}
          totalPages={totalPages}
          hasNext={tablePage < totalPages}
          isFetching={false}
          onChange={onPageChange}
        />
      </section>

      <DriverExportModal
        isOpen={exportDialog.isOpen}
        onOpenChange={exportDialog.setOpen}
        range={range}
        deliveries={settlement.delivered}
        isExporting={isExporting}
        currency={currency}
        onExport={onExport}
      />

      <DriverStatementModal
        isOpen={statementDialog.isOpen}
        onOpenChange={statementDialog.setOpen}
        intent="open"
        value={statementOptions}
        mode="settlement"
        currency={currency}
        onConfirm={onOpenStatement}
      />
    </div>
  );
}

/**
 * Where the balance comes from, line by line, as a reconciliation: the cash the driver took,
 * less what went to the restaurants and what they kept as pay, is Switch's service fees; less
 * what Switch owes them back, is the balance. Then how much of it the wallet already settled.
 */
function Breakdown({
  settlement: s,
  due,
  walletStartsAt,
  currency,
  isPending,
}: {
  settlement: DriverSettlement;
  due: SettlementDue;
  walletStartsAt: string | null;
  currency: CurrencyCode | undefined;
  isPending: boolean;
}) {
  const { t, format } = useI18n();
  const money = (value: number) => format.money(value, currency);
  const minus = (value: number) => (value === 0 ? money(0) : `−${money(value)}`);
  const kept = s.earnings - s.freeDeliveryOwed - s.cardDeliveryOwed;

  return (
    <Card title={t('driverFinance.breakdown.title')} hint={t('driverFinance.breakdown.hint')}>
      {isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <dl className="text-body flex flex-col">
          <Line label={t('driverFinance.breakdown.collected')} value={money(s.cashCollected)} />
          <Line label={t('driverFinance.breakdown.food')} value={minus(s.foodPaid)} muted />
          <Line label={t('driverFinance.breakdown.kept')} value={minus(kept)} muted />
          <Line label={t('driverFinance.breakdown.serviceHeld')} value={money(s.serviceHeld)} isSubtotal />
          <Line label={t('driverFinance.breakdown.freeDelivery', { count: format.number(s.freeDelivery) })} value={minus(s.freeDeliveryOwed)} muted />
          <Line label={t('driverFinance.breakdown.cardDelivery', { count: format.number(s.card) })} value={minus(s.cardDeliveryOwed)} muted />
          <Line
            label={
              s.net >= 0 ? t('driverFinance.breakdown.netDriver') : t('driverFinance.breakdown.netSwitch')
            }
            value={money(Math.abs(s.net))}
            isTotal
          />
          {walletStartsAt && (
            <>
              <Line
                label={t('driverFinance.breakdown.prepaid', { date: format.date(walletStartsAt) })}
                value={signedMoney(-due.prepaid, format, currency)}
                muted
              />
              <Line
                label={
                  due.outstanding >= 0
                    ? t('driverFinance.breakdown.outstandingDriver')
                    : t('driverFinance.breakdown.outstandingSwitch')
                }
                value={money(Math.abs(due.outstanding))}
                isTotal
              />
            </>
          )}
        </dl>
      )}
      <p className="text-caption text-muted">
        {walletStartsAt
          ? t('driverFinance.breakdown.walletNote', { date: format.date(walletStartsAt) })
          : t('driverFinance.breakdown.noWalletNote')}
      </p>
    </Card>
  );
}

function Line({
  label,
  value,
  muted,
  isSubtotal,
  isTotal,
}: {
  label: string;
  value: string;
  muted?: boolean;
  isSubtotal?: boolean;
  isTotal?: boolean;
}) {
  return (
    <div
      className={
        'flex items-baseline justify-between gap-4 py-2 ' +
        (isTotal
          ? 'border-foreground/80 mt-1 border-t-2 font-bold'
          : isSubtotal
            ? 'border-separator border-t font-bold'
            : 'border-separator/50 border-b last:border-b-0')
      }
    >
      <dt className={muted ? 'text-muted' : ''}>{label}</dt>
      <dd className={`tabular whitespace-nowrap ${isTotal ? 'text-h6' : ''}`}>{value}</dd>
    </div>
  );
}

/** What happened to the driver's orders, and how they were paid for. */
function Activity({
  settlement: s,
  currency,
  isPending,
}: {
  settlement: DriverSettlement;
  currency: CurrencyCode | undefined;
  isPending: boolean;
}) {
  const { t, format } = useI18n();
  const cashShare = s.delivered > 0 ? s.cash / s.delivered : 0;

  return (
    <Card title={t('driverFinance.activity.title')}>
      {isPending ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="bg-separator/40 grid grid-cols-3 gap-px overflow-hidden rounded-xl">
            <Figure label={t('driverFinance.activity.delivered')} value={format.number(s.delivered)} />
            <Figure label={t('driverFinance.activity.open')} value={format.number(s.open)} />
            <Figure label={t('driverFinance.activity.canceled')} value={format.number(s.canceled)} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-caption flex items-center justify-between gap-3">
              <span className="text-muted font-bold tracking-[0.08em] uppercase">
                {t('driverFinance.activity.payment')}
              </span>
              <span className="text-muted tabular">
                {t('driverFinance.activity.cashShare', { share: format.rate(cashShare) })}
              </span>
            </div>
            {/* One quantity split in two: a single bar, cash then card, a 2px surface gap
                between the two fills. Labelled below, so colour never carries it alone. */}
            <div
              role="img"
              aria-label={t('driverFinance.activity.split', {
                cash: format.number(s.cash),
                card: format.number(s.card),
              })}
              className="bg-surface-secondary flex h-2.5 gap-[2px] overflow-hidden rounded-full"
            >
              {s.cash > 0 && <span className="bg-accent h-full" style={{ flexGrow: s.cash }} />}
              {s.card > 0 && <span className="bg-accent-soft-hover h-full" style={{ flexGrow: s.card }} />}
            </div>
            <div className="text-caption flex flex-wrap justify-between gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="bg-accent size-2 rounded-full" />
                {t('driverFinance.activity.cash', { count: format.number(s.cash) })}
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="bg-accent-soft-hover size-2 rounded-full" />
                {t('driverFinance.activity.card', { count: format.number(s.card) })}
              </span>
            </div>
          </div>

          <dl className="text-body flex flex-col">
            <Line label={t('driverFinance.activity.freeDeliveries')} value={format.number(s.freeDelivery)} />
            <Line label={t('driverFinance.activity.serviceCard')} value={format.money(s.serviceCard, currency)} />
            <Line label={t('driverFinance.activity.average')} value={format.money(Math.round(s.averageEarning), currency)} />
          </dl>
        </div>
      )}
    </Card>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface flex flex-col gap-0.5 px-3 py-2.5">
      <span className="text-micro text-muted font-bold tracking-[0.1em] uppercase">{label}</span>
      <span className="text-h5 tabular font-bold">{value}</span>
    </div>
  );
}

/**
 * Deliveries per day across the period — one series, so no legend: the title names it. Thin
 * bars with rounded tops on a recessive baseline, a tooltip per day with the day's pay and
 * balance. A single day is a figure, not a chart, and is left to the tiles.
 */
function DailyChart({
  days,
  currency,
  isPending,
}: {
  days: ReturnType<typeof byDay>;
  currency: CurrencyCode | undefined;
  isPending: boolean;
}) {
  const { t, tCount, format } = useI18n();
  if (days.length < 2) return null;

  const max = Math.max(1, ...days.map((day) => day.delivered));
  const busiest = days.reduce((best, day) => (day.delivered > best.delivered ? day : best), days[0]);
  const dateOf = (day: string) => format.date(new Date(`${day}T12:00:00Z`));

  return (
    <Card
      title={t('driverFinance.daily.title')}
      hint={
        busiest.delivered > 0
          ? t('driverFinance.daily.busiest', {
              date: dateOf(busiest.day),
              count: tCount('driverFinance.deliveries', busiest.delivered, {
                count: format.number(busiest.delivered),
              }),
            })
          : undefined
      }
    >
      {isPending ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex h-40 items-end gap-[2px]" role="list" aria-label={t('driverFinance.daily.title')}>
            {days.map((day) => {
              const label = `${dateOf(day.day)} · ${tCount('driverFinance.deliveries', day.delivered, {
                count: format.number(day.delivered),
              })} · ${t('driverFinance.daily.earned', { amount: format.money(day.earnings, currency) })}`;
              return (
                <Tooltip key={day.day} delay={0}>
                  <Tooltip.Trigger
                    role="listitem"
                    aria-label={label}
                    className="group flex h-full min-w-0 flex-1 cursor-default items-end outline-none"
                  >
                    <span
                      className={
                        'w-full rounded-t-[4px] transition-colors ' +
                        (day.delivered > 0
                          ? 'bg-accent group-hover:bg-accent-soft-foreground group-focus-visible:bg-accent-soft-foreground'
                          : 'bg-separator h-px')
                      }
                      style={day.delivered > 0 ? { height: `${(day.delivered / max) * 100}%` } : undefined}
                    />
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p className="text-caption font-bold">{dateOf(day.day)}</p>
                    <p className="text-caption tabular">
                      {tCount('driverFinance.deliveries', day.delivered, { count: format.number(day.delivered) })}
                    </p>
                    <p className="text-caption tabular">
                      {t('driverFinance.daily.earned', { amount: format.money(day.earnings, currency) })}
                    </p>
                    <p className="text-caption tabular">
                      {t('driverFinance.daily.balance', { amount: signedMoney(day.net, format, currency) })}
                    </p>
                  </Tooltip.Content>
                </Tooltip>
              );
            })}
          </div>
          <div className="border-separator text-caption text-muted tabular flex justify-between border-t pt-1.5">
            <span>{dateOf(days[0].day)}</span>
            <span>{t('driverFinance.daily.max', { count: format.number(max) })}</span>
            <span>{dateOf(days[days.length - 1].day)}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

const COLUMNS = [
  { key: 'order', className: 'w-[9rem] text-start' },
  { key: 'restaurant', className: 'min-w-[10rem] text-start' },
  { key: 'status', className: 'w-[9.5rem] text-start' },
  { key: 'payment', className: 'w-[9rem] text-start' },
  { key: 'service', className: 'w-[8rem] text-end' },
  { key: 'delivery', className: 'w-[8rem] text-end' },
  { key: 'balance', className: 'w-[9rem] text-end' },
] as const;

function OrdersTable({
  orders,
  currency,
  walletStartsAt,
  isStale,
}: {
  orders: DriverOrder[];
  currency: CurrencyCode | undefined;
  walletStartsAt: string | null;
  isStale: boolean;
}) {
  const { t, format } = useI18n();
  const walletFrom = walletStartsAt ? new Date(walletStartsAt).getTime() : null;

  return (
    <Table variant="secondary" className="px-3 pb-1">
      <Table.ScrollContainer>
        <Table.Content
          aria-label={t('driverFinance.ordersTitle')}
          className={'min-w-[60rem] transition-opacity ' + (isStale ? 'opacity-50' : '')}
        >
          <Table.Header>
            {COLUMNS.map((column) => (
              <Table.Column
                key={column.key}
                isRowHeader={column.key === 'order'}
                className={`text-micro tracking-[0.12em] uppercase ${column.className}`}
              >
                {t(`driverFinance.columns.${column.key}`)}
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body items={orders} dependencies={[walletFrom, currency]}>
            {(order: DriverOrder) => {
              const balance = balanceOf(order);
              const prepaid = walletFrom !== null && new Date(order.createdAt).getTime() >= walletFrom;
              return (
                <Table.Row id={order.objectId}>
                  <Table.Cell className="whitespace-nowrap">
                    <span className="text-caption tabular block font-bold" title={order.objectId}>
                      #{shortId(order.objectId)}
                    </span>
                    <span className="text-caption text-muted tabular block">{format.dateTime(order.createdAt)}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-body block truncate">{order.restaurant?.name ?? '—'}</span>
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    <OrderStatusChip status={order.status} canceled={order.canceled} deliveryType={order.deliveryType} />
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    <span className="text-body block">
                      {isCash(order) ? t('sheet.payment.cash') : t('sheet.payment.card')}
                    </span>
                    {order.options?.freeDelivery && (
                      <span className="text-caption text-muted block">{t('driverFinance.freeDelivery')}</span>
                    )}
                  </Table.Cell>
                  <Table.Cell className="text-end whitespace-nowrap">
                    <span className="text-body tabular">{format.money(serviceOf(order), currency)}</span>
                  </Table.Cell>
                  <Table.Cell className="text-end whitespace-nowrap">
                    <span className="text-body tabular">{format.money(earningOf(order), currency)}</span>
                  </Table.Cell>
                  <Table.Cell className="text-end whitespace-nowrap">
                    {balance === null ? (
                      <span className="text-caption text-muted">{t('driverFinance.notCounted')}</span>
                    ) : (
                      <>
                        <span className="text-body tabular block font-bold">
                          {signedMoney(balance, format, currency)}
                        </span>
                        {prepaid && (
                          <span className="text-caption text-muted block">{t('driverFinance.viaWallet')}</span>
                        )}
                      </>
                    )}
                  </Table.Cell>
                </Table.Row>
              );
            }}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-border/70 bg-surface rounded-card shadow-card flex flex-col gap-4 border p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-h6 font-bold">{title}</h2>
        {hint && <p className="text-caption text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
