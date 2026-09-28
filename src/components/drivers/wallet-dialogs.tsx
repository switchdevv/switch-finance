'use client';

import { useState, type ReactNode } from 'react';
import { today } from '@internationalized/date';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Label,
  Modal,
  NumberField,
  Skeleton,
  TextField,
} from '@heroui/react';
import {
  useAdjustment,
  useRefund,
  useRefundPreview,
  useTopUp,
  useVoidEntry,
} from '@/hooks/use-driver-wallets';
import { BUSINESS_TIME_ZONE, parseCalendarDate } from '@/lib/finance/date-range';
import { useI18n } from '@/lib/i18n/provider';
import { walletErrorKey } from '@/lib/parse/errors';
import { newRequestId } from '@/lib/services/wallets';
import type { CurrencyCode } from '@/types/city';
import type { LedgerEntryLine, TopUpMethod, WalletSummary } from '@/types/wallet';
import { DateInput } from '@/components/ui/date-range-toolbar';
import { SegmentedControl } from '@/components/ui/segmented-control';

/** The driver a dialog is about. */
export type DriverRef = { id: string; name: string; cityName?: string };

type DialogProps = { isOpen: boolean; onOpenChange: (isOpen: boolean) => void };

/** Largest count one request may move — the server's limit, stated here for the fields. */
const MAX_ORDERS = 100_000;

/**
 * The shell every wallet dialog shares. Its form is mounted only while open, so each opening
 * starts clean — and makes a fresh request id: the server records an entry once per id, so
 * a double click or a retry after a timeout can't top a driver up twice.
 */
function WalletDialog({ isOpen, onOpenChange, children }: DialogProps & { children: ReactNode }) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>{isOpen && children}</Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function ErrorLine({ error }: { error: unknown }) {
  const { t } = useI18n();
  if (!error) return null;
  return (
    <Alert status="danger">
      <Alert.Content>
        <Alert.Description>{t(walletErrorKey(error))}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

/** The figure the dialog is about, set apart: what to collect, what to hand back. */
function Figure({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="border-border/70 bg-surface-secondary/60 rounded-card flex flex-col gap-1 border px-4 py-3">
      <span className="text-caption text-muted font-bold tracking-[0.08em] uppercase">{label}</span>
      <span className="text-h4 tabular leading-tight font-bold">{value}</span>
      {detail && <span className="text-caption text-muted">{detail}</span>}
    </div>
  );
}

function OrdersField({
  label,
  value,
  max = MAX_ORDERS,
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <NumberField
      value={value}
      // An emptied field comes back as NaN: read it as 0, which disables the submit.
      onChange={(next) => onChange(Number.isFinite(next) ? next : 0)}
      minValue={1}
      maxValue={max}
      step={1}
      formatOptions={{ maximumFractionDigits: 0 }}
      fullWidth
    >
      <Label>{label}</Label>
      <NumberField.Group>
        <NumberField.DecrementButton />
        <NumberField.Input />
        <NumberField.IncrementButton />
      </NumberField.Group>
    </NumberField>
  );
}

function TextLine({
  label,
  value,
  placeholder,
  onChange,
  isRequired,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  isRequired?: boolean;
}) {
  return (
    <TextField value={value} onChange={onChange} isRequired={isRequired} maxLength={500} fullWidth>
      <Label>{label}</Label>
      <Input placeholder={placeholder} />
    </TextField>
  );
}

const isWhole = (value: number, max = MAX_ORDERS) =>
  Number.isInteger(value) && value >= 1 && value <= max;

// ---------------------------------------------------------------------------------------------

export function TopUpDialog({
  driver,
  pricing,
  hasWallet,
  ...dialog
}: DialogProps & {
  driver: DriverRef;
  pricing: { unitPriceToday: number | null; currency: CurrencyCode | null };
  hasWallet: boolean;
}) {
  return (
    <WalletDialog {...dialog}>
      <TopUpForm
        driver={driver}
        pricing={pricing}
        hasWallet={hasWallet}
        onDone={() => dialog.onOpenChange(false)}
      />
    </WalletDialog>
  );
}

const METHODS: readonly TopUpMethod[] = ['cash', 'transfer', 'carriedOver'];

function TopUpForm({
  driver,
  pricing,
  hasWallet,
  onDone,
}: {
  driver: DriverRef;
  pricing: { unitPriceToday: number | null; currency: CurrencyCode | null };
  hasWallet: boolean;
  onDone: () => void;
}) {
  const { t, tCount, format } = useI18n();
  const topUp = useTopUp();
  const [requestId] = useState(newRequestId);
  const [orders, setOrders] = useState(50);
  const [method, setMethod] = useState<TopUpMethod>('cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const todayDate = today(BUSINESS_TIME_ZONE);
  const [startDate, setStartDate] = useState(todayDate.toString());

  const price = pricing.unitPriceToday;
  const currency = pricing.currency ?? undefined;
  const canSubmit = !!price && isWhole(orders) && !topUp.isPending;

  const submit = () => {
    // Today means "from now": a wallet opened this afternoon shouldn't use up this
    // morning's deliveries, which were settled the old way. An earlier date carries a
    // manual balance over from that day's start.
    const start = parseCalendarDate(startDate);
    const startsAt =
      hasWallet || !start || startDate === todayDate.toString()
        ? undefined
        : start.toDate(BUSINESS_TIME_ZONE).toISOString();
    topUp.mutate(
      {
        driverId: driver.id,
        orders,
        method,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
        startsAt,
        requestId,
      },
      { onSuccess: onDone },
    );
  };

  return (
    <>
      <Modal.Header>
        <Modal.Heading>{t('wallet.topUp.title', { name: driver.name })}</Modal.Heading>
        <p className="text-caption text-muted">{t('wallet.topUp.subtitle')}</p>
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-5">
        {!price ? (
          <Alert status="warning">
            <Alert.Content>
              <Alert.Description>{t('wallet.topUp.noPrice')}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : (
          <>
            <OrdersField label={t('wallet.topUp.orders')} value={orders} onChange={setOrders} />
            <Figure
              label={t('wallet.topUp.collect')}
              value={isWhole(orders) ? format.money(orders * price, currency) : '—'}
              detail={t('wallet.topUp.collectDetail', {
                orders: tCount('wallet.orders', orders, { count: format.number(orders) }),
                price: format.money(price, currency),
                city: driver.cityName ?? '—',
              })}
            />
          </>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-caption text-muted font-bold">{t('wallet.topUp.method')}</span>
          <SegmentedControl
            label={t('wallet.topUp.method')}
            options={METHODS.map((key) => ({ key, label: t(`wallet.methods.${key}`) }))}
            value={method}
            onChange={setMethod}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextLine
            label={t('wallet.topUp.reference')}
            value={reference}
            placeholder={t('wallet.topUp.referencePlaceholder')}
            onChange={setReference}
          />
          <TextLine label={t('wallet.note')} value={note} onChange={setNote} />
        </div>

        {!hasWallet && (
          <div className="flex flex-col gap-2">
            <DateInput
              label={t('wallet.topUp.startsAt')}
              value={startDate}
              min={todayDate.subtract({ days: 365 }).toString()}
              max={todayDate.toString()}
              onChange={setStartDate}
            />
            <p className="text-caption text-muted">{t('wallet.topUp.startsAtHint')}</p>
          </div>
        )}

        <ErrorLine error={topUp.error} />
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" size="sm" isDisabled={topUp.isPending} onPress={onDone}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="sm" isDisabled={!canSubmit} onPress={submit}>
          {topUp.isPending ? t('wallet.saving') : t('wallet.topUp.submit')}
        </Button>
      </Modal.Footer>
    </>
  );
}

// ---------------------------------------------------------------------------------------------

export function RefundDialog({
  driver,
  summary,
  ...dialog
}: DialogProps & { driver: DriverRef; summary: WalletSummary }) {
  return (
    <WalletDialog {...dialog}>
      <RefundForm driver={driver} summary={summary} onDone={() => dialog.onOpenChange(false)} />
    </WalletDialog>
  );
}

type RefundMode = 'all' | 'some';

function RefundForm({
  driver,
  summary,
  onDone,
}: {
  driver: DriverRef;
  summary: WalletSummary;
  onDone: () => void;
}) {
  const { t, tCount, format } = useI18n();
  const refund = useRefund();
  const [requestId] = useState(newRequestId);
  const [mode, setMode] = useState<RefundMode>('all');
  const [orders, setOrders] = useState(Math.max(1, Math.min(summary.ordersLeft, 1)));
  const [close, setClose] = useState(true);
  const [note, setNote] = useState('');
  const currency = summary.currency ?? undefined;

  const hasBalance = summary.units > 0;
  const partial = mode === 'some';
  const validOrders = !partial || isWhole(orders, summary.ordersLeft);
  // The amount is the server's, computed exactly as recording will: the oldest orders
  // first, each at what was paid for it — so what is shown is what is handed over.
  const preview = useRefundPreview(
    driver.id,
    partial ? orders : undefined,
    hasBalance && validOrders && !refund.isPending && !refund.isSuccess,
  );

  const submit = () =>
    refund.mutate(
      {
        driverId: driver.id,
        orders: partial ? orders : undefined,
        close: partial ? undefined : close,
        note: note.trim() || undefined,
        requestId,
      },
      { onSuccess: onDone },
    );

  return (
    <>
      <Modal.Header>
        <Modal.Heading>{t('wallet.refund.title', { name: driver.name })}</Modal.Heading>
        <p className="text-caption text-muted">{t('wallet.refund.subtitle')}</p>
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-5">
        {!hasBalance ? (
          <Alert status="warning">
            <Alert.Content>
              <Alert.Description>
                {summary.value < 0
                  ? t('wallet.refund.owes', { amount: format.money(-summary.value, currency) })
                  : t('wallet.errors.nothingToRefund')}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : (
          <>
            {summary.ordersLeft >= 1 && (
              <SegmentedControl
                label={t('wallet.refund.modeLabel')}
                options={[
                  { key: 'all', label: t('wallet.refund.all') },
                  { key: 'some', label: t('wallet.refund.some') },
                ]}
                value={mode}
                onChange={setMode}
              />
            )}

            {partial && (
              <OrdersField
                label={t('wallet.refund.orders')}
                value={orders}
                max={summary.ordersLeft}
                onChange={setOrders}
              />
            )}

            <Figure
              label={t('wallet.refund.payBack')}
              value={
                preview.status === 'success' ? (
                  format.money(preview.data.amount, currency)
                ) : preview.status === 'error' || !validOrders ? (
                  '—'
                ) : (
                  <Skeleton className="h-8 w-32 rounded-md" />
                )
              }
              detail={
                partial
                  ? t('wallet.refund.payBackSome')
                  : t('wallet.refund.payBackAll', {
                      orders: tCount('wallet.orders', summary.ordersLeft, {
                        count: format.orders(summary.units),
                      }),
                    })
              }
            />
            {preview.status === 'error' && <ErrorLine error={preview.error} />}

            {!partial && (
              <Checkbox isSelected={close} onChange={setClose}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Label>{t('wallet.refund.close')}</Label>
                </Checkbox.Content>
                <p className="text-caption text-muted ps-7">{t('wallet.refund.closeHint')}</p>
              </Checkbox>
            )}

            <TextLine label={t('wallet.note')} value={note} onChange={setNote} />
          </>
        )}

        <ErrorLine error={refund.error} />
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" size="sm" isDisabled={refund.isPending} onPress={onDone}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          isDisabled={!hasBalance || !validOrders || preview.status !== 'success' || refund.isPending}
          onPress={submit}
        >
          {refund.isPending ? t('wallet.saving') : t('wallet.refund.submit')}
        </Button>
      </Modal.Footer>
    </>
  );
}

// ---------------------------------------------------------------------------------------------

export function AdjustDialog({
  driver,
  summary,
  ...dialog
}: DialogProps & { driver: DriverRef; summary: WalletSummary }) {
  return (
    <WalletDialog {...dialog}>
      <AdjustForm driver={driver} summary={summary} onDone={() => dialog.onOpenChange(false)} />
    </WalletDialog>
  );
}

type Direction = 'add' | 'remove';

function AdjustForm({
  driver,
  summary,
  onDone,
}: {
  driver: DriverRef;
  summary: WalletSummary;
  onDone: () => void;
}) {
  const { t, format } = useI18n();
  const adjust = useAdjustment();
  const [requestId] = useState(newRequestId);
  const [direction, setDirection] = useState<Direction>('add');
  const [orders, setOrders] = useState(1);
  const [unitPrice, setUnitPrice] = useState(summary.unitPriceToday ?? 0);
  const [reason, setReason] = useState('');
  const currency = summary.currency ?? undefined;

  const canSubmit =
    isWhole(orders) &&
    reason.trim().length > 0 &&
    (direction === 'remove' || (Number.isInteger(unitPrice) && unitPrice >= 0)) &&
    !adjust.isPending;

  const submit = () =>
    adjust.mutate(
      {
        driverId: driver.id,
        orders: direction === 'add' ? orders : -orders,
        unitPrice: direction === 'add' ? unitPrice : undefined,
        reason: reason.trim(),
        requestId,
      },
      { onSuccess: onDone },
    );

  return (
    <>
      <Modal.Header>
        <Modal.Heading>{t('wallet.adjust.title', { name: driver.name })}</Modal.Heading>
        <p className="text-caption text-muted">{t('wallet.adjust.subtitle')}</p>
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-5">
        <SegmentedControl
          label={t('wallet.adjust.directionLabel')}
          options={[
            { key: 'add', label: t('wallet.adjust.add') },
            { key: 'remove', label: t('wallet.adjust.remove') },
          ]}
          value={direction}
          onChange={setDirection}
        />

        <OrdersField label={t('wallet.adjust.orders')} value={orders} onChange={setOrders} />

        {direction === 'add' ? (
          <div className="flex flex-col gap-2">
            <NumberField
              value={unitPrice}
              onChange={(next) => setUnitPrice(Number.isFinite(next) ? next : 0)}
              minValue={0}
              step={1}
              formatOptions={{ maximumFractionDigits: 0 }}
              fullWidth
            >
              <Label>{t('wallet.adjust.value')}</Label>
              <NumberField.Group>
                <NumberField.Input />
              </NumberField.Group>
            </NumberField>
            <p className="text-caption text-muted">
              {t('wallet.adjust.valueHint', {
                price: format.money(summary.unitPriceToday, currency),
              })}
            </p>
          </div>
        ) : (
          <p className="text-caption text-muted">{t('wallet.adjust.removeHint')}</p>
        )}

        <TextLine
          label={t('wallet.adjust.reason')}
          value={reason}
          onChange={setReason}
          isRequired
        />

        <ErrorLine error={adjust.error} />
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" size="sm" isDisabled={adjust.isPending} onPress={onDone}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="sm" isDisabled={!canSubmit} onPress={submit}>
          {adjust.isPending ? t('wallet.saving') : t('wallet.adjust.submit')}
        </Button>
      </Modal.Footer>
    </>
  );
}

// ---------------------------------------------------------------------------------------------

export function VoidDialog({
  entry,
  currency,
  ...dialog
}: DialogProps & { entry: LedgerEntryLine | null; currency: CurrencyCode | undefined }) {
  return (
    <WalletDialog {...dialog}>
      {entry && (
        <VoidForm entry={entry} currency={currency} onDone={() => dialog.onOpenChange(false)} />
      )}
    </WalletDialog>
  );
}

function VoidForm({
  entry,
  currency,
  onDone,
}: {
  entry: LedgerEntryLine;
  currency: CurrencyCode | undefined;
  onDone: () => void;
}) {
  const { t, format } = useI18n();
  const voidEntry = useVoidEntry();
  const [reason, setReason] = useState('');

  return (
    <>
      <Modal.Header>
        <Modal.Heading>
          {t('wallet.void.title', { kind: t(`wallet.ledger.kinds.${entry.kind}`) })}
        </Modal.Heading>
        <p className="text-caption text-muted">{t('wallet.void.subtitle')}</p>
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-5">
        <Figure
          label={format.dateTime(entry.at)}
          value={`${entry.units > 0 ? '+' : ''}${format.orders(entry.units)}`}
          detail={
            entry.amount
              ? `${format.money(entry.amount, currency)} · ${entry.by.name ?? '—'}`
              : (entry.by.name ?? undefined)
          }
        />
        <TextLine
          label={t('wallet.void.reason')}
          value={reason}
          onChange={setReason}
          isRequired
        />
        <ErrorLine error={voidEntry.error} />
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" size="sm" isDisabled={voidEntry.isPending} onPress={onDone}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="danger"
          size="sm"
          isDisabled={!reason.trim() || voidEntry.isPending}
          onPress={() =>
            voidEntry.mutate({ entryId: entry.id, reason: reason.trim() }, { onSuccess: onDone })
          }
        >
          {voidEntry.isPending ? t('wallet.saving') : t('wallet.void.submit')}
        </Button>
      </Modal.Footer>
    </>
  );
}
