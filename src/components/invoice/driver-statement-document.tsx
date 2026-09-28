'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, useOverlayState } from '@heroui/react';
import { useCities } from '@/hooks/use-cities';
import { useDriverOrdersInRange } from '@/hooks/use-driver-orders';
import { useDriver } from '@/hooks/use-drivers';
import { useDriverWallet } from '@/hooks/use-driver-wallets';
import { hasCarryOver, type CarryOver } from '@/lib/finance/carry-over';
import { resolveRange, type DateRange } from '@/lib/finance/date-range';
import {
  isDelivered,
  settle,
  settlementDue,
  type DriverSettlement,
  type SettlementDue,
} from '@/lib/finance/driver-settlement';
import {
  MODE_PARAM,
  readStatementMode,
  readStatementOptions,
  signedMoney,
  STATEMENT_COLUMNS,
  STATEMENT_MODES,
  writeStatementOptions,
  type StatementColumnKey,
  type StatementMode,
  type StatementOptions,
} from '@/lib/invoice/driver-statement';
import { formatOrNone, shortId } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';
import { parseErrorKey } from '@/lib/parse/errors';
import { readDriverId } from '@/lib/url/routes';
import type { CurrencyCode } from '@/types/city';
import type { Driver } from '@/types/driver';
import type { DriverOrder } from '@/types/order';
import { BrandMark } from '@/components/brand-mark';
import { LanguageToggle } from '@/components/language-toggle';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { DriverStatementModal } from '@/components/drivers/driver-export-dialogs';
import { PrinterIcon } from '@/components/icons';

/**
 * A driver's statement for a period, on paper — the restaurant invoice's counterpart
 * (invoice-document.tsx), built the same way: everything from the link, a Print dialog that
 * rewrites the link, a language toggle, and the tab title as the PDF's filename.
 */
export function DriverStatementDocument() {
  const { t, format } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const driverId = readDriverId(searchParams);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const [mode, setMode] = useState<StatementMode>(() => readStatementMode(searchParams));
  const [options, setOptions] = useState<StatementOptions>(() => readStatementOptions(searchParams));
  const optionsDialog = useOverlayState();

  const range = useMemo(() => resolveRange('custom', from, to), [from, to]);
  const driverQuery = useDriver(driverId);
  const ordersQuery = useDriverOrdersInRange(driverId, range);
  // Only for the day the wallet started counting. A server without wallets (legacy) answers
  // an error, which simply means nothing was prepaid.
  const walletQuery = useDriverWallet(driverId, range);
  const cities = useCities();

  const driver = driverQuery.data;
  const city = cities.data?.find((entry) => entry.objectId === driver?.city?.objectId);
  const walletStartsAt = walletQuery.data?.ledger?.summary.startsAt ?? null;
  const delivered = useMemo(() => (ordersQuery.data?.orders ?? []).filter(isDelivered), [ordersQuery.data]);
  const settlement = useMemo(() => settle(ordersQuery.data?.orders ?? []), [ordersQuery.data]);
  const carried = hasCarryOver(options.carryOver) ? options.carryOver.amount : 0;
  const due = useMemo(
    () => settlementDue(delivered, walletStartsAt, carried),
    [delivered, walletStartsAt, carried],
  );

  const documentTitle =
    driver &&
    `${t(`driverStatement.modes.${mode}`)} — ${formatOrNone(driver.fullname ?? driver.username)} — ${format.range(range)}`;
  useEffect(() => {
    if (!documentTitle) return;
    const previous = document.title;
    document.title = documentTitle;
    return () => {
      document.title = previous;
    };
  }, [documentTitle]);

  const [printRequest, setPrintRequest] = useState(0);
  useEffect(() => {
    if (printRequest === 0) return;
    const frame = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(frame);
  }, [printRequest]);

  const replaceUrl = (nextOptions: StatementOptions, nextMode: StatementMode) => {
    const params = new URLSearchParams(searchParams.toString());
    writeStatementOptions(params, nextOptions);
    if (nextMode === 'settlement') params.delete(MODE_PARAM);
    else params.set(MODE_PARAM, nextMode);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const applyAndPrint = (next: StatementOptions) => {
    setOptions(next);
    replaceUrl(next, mode);
    optionsDialog.close();
    setPrintRequest((count) => count + 1);
  };

  if (!driverId) return <p className="text-muted p-10 text-center">{t('invoice.incomplete')}</p>;

  if (driverQuery.status === 'error' || ordersQuery.status === 'error') {
    return (
      <div className="mx-auto max-w-2xl p-10">
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>{t('driverStatement.buildError')}</Alert.Title>
            <Alert.Description>
              {t(parseErrorKey(driverQuery.error ?? ordersQuery.error, 'fetch'))}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  if (driverQuery.status === 'pending' || ordersQuery.status === 'pending' || walletQuery.isPending) {
    return <p className="text-muted p-10 text-center">{t('driverStatement.preparing')}</p>;
  }

  if (!driver) return <p className="text-muted p-10 text-center">{t('driverStatement.gone')}</p>;

  return (
    <div className="bg-surface-secondary min-h-dvh py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <SegmentedControl
          label={t('driverStatement.modeLabel')}
          options={STATEMENT_MODES.map((key) => ({ key, label: t(`driverStatement.modes.${key}`) }))}
          value={mode}
          onChange={(next) => {
            setMode(next);
            replaceUrl(options, next);
          }}
        />
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Button variant="primary" size="sm" onPress={optionsDialog.open}>
            <PrinterIcon className="size-4" />
            {t('invoice.print')}
          </Button>
        </div>
      </div>

      {ordersQuery.data?.truncated && (
        <div className="mx-auto mb-6 max-w-[210mm] px-4 print:hidden">
          <Alert status="warning">
            <Alert.Content>
              <Alert.Title>{t('invoice.truncatedTitle')}</Alert.Title>
              <Alert.Description>
                {t('invoice.truncatedBody', { count: format.number(ordersQuery.data.orders.length) })}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      )}

      <StatementSheet
        driver={driver}
        cityName={city?.name}
        range={range}
        orders={delivered}
        settlement={settlement}
        due={due}
        walletStartsAt={walletStartsAt}
        currency={city?.currency}
        mode={mode}
        columns={options.columns}
        carryOver={options.carryOver}
      />

      <DriverStatementModal
        isOpen={optionsDialog.isOpen}
        onOpenChange={optionsDialog.setOpen}
        intent="print"
        value={options}
        currency={city?.currency}
        onConfirm={applyAndPrint}
      />
    </div>
  );
}

/** Everything that reaches paper, and nothing that fetches. */
export function StatementSheet({
  driver,
  cityName,
  range,
  orders,
  settlement,
  due,
  walletStartsAt,
  currency,
  mode,
  columns,
  carryOver,
}: {
  driver: Driver;
  cityName: string | undefined;
  range: DateRange;
  /** Delivered only. */
  orders: DriverOrder[];
  settlement: DriverSettlement;
  due: SettlementDue;
  walletStartsAt: string | null;
  currency: CurrencyCode | undefined;
  mode: StatementMode;
  columns: readonly StatementColumnKey[];
  carryOver: CarryOver;
}) {
  const { t, format } = useI18n();

  return (
    <article className="invoice-sheet shadow-card mx-auto max-w-[210mm] bg-white px-[14mm] py-[14mm] text-[#111827] print:max-w-none print:shadow-none">
      <header className="mb-8 flex items-start justify-between gap-6 border-b border-[#e5e7eb] pb-6">
        <div className="flex items-center gap-3">
          <BrandMark className="size-10" />
          <div>
            <p className="text-h6 font-bold">{t('app.name')}</p>
            <p className="text-caption text-[#6b7280]">{t('invoice.tagline')}</p>
          </div>
        </div>
        <div className="text-end">
          <p className="text-h5 font-bold">{t(`driverStatement.modes.${mode}`)}</p>
          {/* Deterministic, like the restaurant invoice's: the same driver and period always
              print the same number. */}
          <p className="text-caption tabular text-[#6b7280]">
            {t('invoice.number', {
              number: `SW-D-${shortId(driver.objectId)}-${range.from.replace(/-/g, '')}`,
            })}
          </p>
          <p className="text-caption tabular mt-2">
            <span className="text-[#6b7280]">{t('invoice.period')} </span>
            {format.range(range)}
          </p>
          <p className="text-caption tabular">
            <span className="text-[#6b7280]">{t('invoice.issued')} </span>
            {format.date(new Date())}
          </p>
        </div>
      </header>

      <section className="mb-8">
        <p className="text-micro font-bold tracking-[0.12em] text-[#6b7280] uppercase">
          {t('driverStatement.for')}
        </p>
        <p className="text-h6 mt-1.5 font-bold">{formatOrNone(driver.fullname ?? driver.username)}</p>
        <p className="text-caption text-[#374151]">
          {cityName ?? t('drivers.noCity')}
          {driver.username ? ` · ${driver.username}` : ''}
        </p>
        {driver.phone && <p className="text-caption tabular text-[#374151]">{driver.phone}</p>}
      </section>

      {mode === 'settlement' ? (
        <SettlementSummary
          settlement={settlement}
          due={due}
          walletStartsAt={walletStartsAt}
          currency={currency}
          carryOver={carryOver}
        />
      ) : (
        <EarningsSummary settlement={settlement} currency={currency} />
      )}

      <Lines orders={orders} currency={currency} columns={columns} />

      <footer className="border-t border-[#e5e7eb] pt-4 text-[11px] leading-relaxed text-[#6b7280]">
        <p>{t('driverStatement.footnote.rule')}</p>
        {walletStartsAt && (
          <p className="mt-1">
            {t('driverStatement.footnote.wallet', { date: format.date(walletStartsAt) })}
          </p>
        )}
      </footer>
    </article>
  );
}

type Row = { label: string; value: string; isSub?: boolean };

function SummaryTable({ rows, totalLabel, totalValue }: { rows: Row[]; totalLabel: string; totalValue: string }) {
  return (
    <table className="w-full text-[13px]">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-[#f3f4f6]">
            <td className={`py-2 ${row.isSub ? 'font-bold' : 'text-[#374151]'}`}>{row.label}</td>
            <td className={`tabular py-2 text-end ${row.isSub ? 'font-bold' : ''}`}>{row.value}</td>
          </tr>
        ))}
        <tr className="border-t-2 border-[#111827]">
          <td className="py-3 font-bold">{totalLabel}</td>
          <td className="tabular py-3 text-end text-[16px] font-bold">{totalValue}</td>
        </tr>
      </tbody>
    </table>
  );
}

function SettlementSummary({
  settlement: s,
  due,
  walletStartsAt,
  currency,
  carryOver,
}: {
  settlement: DriverSettlement;
  due: SettlementDue;
  walletStartsAt: string | null;
  currency: CurrencyCode | undefined;
  carryOver: CarryOver;
}) {
  const { t, format } = useI18n();
  const money = (value: number) => format.money(value, currency);
  const minus = (value: number) => (value === 0 ? money(0) : `−${money(value)}`);
  const kept = s.earnings - s.freeDeliveryOwed - s.cardDeliveryOwed;
  const hasWallet = !!walletStartsAt && due.prepaid !== 0;
  const carried = hasCarryOver(carryOver);

  const rows: Row[] = [
    {
      label: t('driverStatement.summary.deliveries'),
      value: t('driverStatement.summary.deliveriesValue', {
        count: format.number(s.delivered),
        cash: format.number(s.cash),
        card: format.number(s.card),
      }),
    },
    { label: t('driverFinance.breakdown.collected'), value: money(s.cashCollected) },
    { label: t('driverFinance.breakdown.food'), value: minus(s.foodPaid) },
    { label: t('driverFinance.breakdown.kept'), value: minus(kept) },
    { label: t('driverFinance.breakdown.serviceHeld'), value: money(s.serviceHeld), isSub: true },
    {
      label: t('driverFinance.breakdown.freeDelivery', { count: format.number(s.freeDelivery) }),
      value: minus(s.freeDeliveryOwed),
    },
    {
      label: t('driverFinance.breakdown.cardDelivery', { count: format.number(s.card) }),
      value: minus(s.cardDeliveryOwed),
    },
  ];

  const onlyNet = !hasWallet && !carried;
  if (!onlyNet) {
    rows.push({ label: t('driverStatement.summary.net'), value: signedMoney(due.net, format, currency), isSub: true });
    if (hasWallet) {
      rows.push({
        label: t('driverFinance.breakdown.prepaid', { date: format.date(walletStartsAt) }),
        value: signedMoney(-due.prepaid, format, currency),
      });
    }
    if (carried) {
      rows.push({
        label: carryOver.note
          ? t('invoice.summary.previousBalanceNoted', { note: carryOver.note })
          : t('invoice.summary.previousBalance'),
        value: signedMoney(carryOver.amount, format, currency),
      });
    }
  }

  const total = onlyNet ? due.net : due.due;
  return (
    <section className="mb-8">
      <SummaryTable
        rows={rows}
        totalLabel={
          total >= 0 ? t('driverSheet.lines.dueFromDriver') : t('driverSheet.lines.dueToDriver')
        }
        totalValue={money(Math.abs(total))}
      />
    </section>
  );
}

function EarningsSummary({
  settlement: s,
  currency,
}: {
  settlement: DriverSettlement;
  currency: CurrencyCode | undefined;
}) {
  const { t, format } = useI18n();
  const money = (value: number) => format.money(value, currency);
  const kept = s.earnings - s.freeDeliveryOwed - s.cardDeliveryOwed;

  return (
    <section className="mb-8">
      <SummaryTable
        rows={[
          {
            label: t('driverStatement.summary.deliveries'),
            value: t('driverStatement.summary.deliveriesValue', {
              count: format.number(s.delivered),
              cash: format.number(s.cash),
              card: format.number(s.card),
            }),
          },
          { label: t('driverStatement.summary.keptCash'), value: money(kept) },
          { label: t('driverStatement.summary.fromSwitch'), value: money(s.freeDeliveryOwed + s.cardDeliveryOwed) },
          { label: t('driverFinance.activity.average'), value: money(Math.round(s.averageEarning)) },
        ]}
        totalLabel={t('driverStatement.summary.earnings')}
        totalValue={money(s.earnings)}
      />
      <p className="text-caption mt-3 text-[#374151]">
        {s.net >= 0 ? t('driverStatement.summary.infoDriver') : t('driverStatement.summary.infoSwitch')}{' '}
        <strong className="tabular">{money(Math.abs(s.net))}</strong>
      </p>
    </section>
  );
}

function Lines({
  orders,
  currency,
  columns,
}: {
  orders: DriverOrder[];
  currency: CurrencyCode | undefined;
  columns: readonly StatementColumnKey[];
}) {
  const { t, format } = useI18n();
  const picked = new Set(columns);
  const printed = STATEMENT_COLUMNS.filter((column) => picked.has(column.key));
  if (printed.length === 0 || orders.length === 0) return null;
  const context = { t, format, currency };

  return (
    <section className="mb-8">
      <p className="text-micro mb-2 font-bold tracking-[0.12em] text-[#6b7280] uppercase">
        {t('driverStatement.linesTitle')}
      </p>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-[#f3f4f6] text-start">
            {printed.map((column) => (
              <th
                key={column.key}
                className={`px-2 py-2 font-bold ${column.align === 'end' ? 'text-end' : 'text-start'}`}
              >
                {t(column.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.objectId} className="border-b border-[#f3f4f6]">
              {printed.map((column) => (
                <td
                  key={column.key}
                  className={`tabular px-2 py-1.5 ${column.align === 'end' ? 'text-end' : ''} ${
                    column.isStrong ? 'font-bold' : ''
                  }`}
                >
                  {column.cell(order, context)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
