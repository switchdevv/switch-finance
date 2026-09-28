'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Skeleton, Typography, useOverlayState } from '@heroui/react';
import { useAccess } from '@/hooks/use-access';
import { useCities } from '@/hooks/use-cities';
import { useDriver, useDrivers } from '@/hooks/use-drivers';
import { useDriverWallet } from '@/hooks/use-driver-wallets';
import { parsePreset, resolveRange, type RangePreset } from '@/lib/finance/date-range';
import { driverWalletState } from '@/lib/finance/wallet';
import { formatOrNone, initials, splitPhones } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';
import { parseErrorKey, walletErrorKey } from '@/lib/parse/errors';
import { DRIVERS_HREF, readDriverId } from '@/lib/url/routes';
import type { Driver } from '@/types/driver';
import type { LedgerEntryLine, WalletDetail } from '@/types/wallet';
import { DateRangeToolbar } from '@/components/ui/date-range-toolbar';
import { StatTile } from '@/components/ui/stat-tile';
import { AccountChip } from '@/components/drivers/drivers-table';
import {
  AdjustDialog,
  RefundDialog,
  TopUpDialog,
  VoidDialog,
  type DriverRef,
} from '@/components/drivers/wallet-dialogs';
import { WalletLedgerTable } from '@/components/drivers/wallet-ledger';
import { WalletStateChip } from '@/components/drivers/wallet-state-chip';
import {
  ArrowLeftIcon,
  BikeIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  ReceiptIcon,
  RefundIcon,
  SlidersIcon,
  TagIcon,
  WalletIcon,
} from '@/components/icons';

/**
 * One driver's prepaid wallet: what is left and what it is worth, the ways money comes in
 * and goes back out, and the ledger of every movement over a period. The period lives in the
 * URL (`?range=&from=&to=`), like a restaurant's report, and defaults to this month.
 */
export function DriverDetail() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const driverId = readDriverId(searchParams);
  const backHref = safeBackHref(searchParams.get('back'));
  const { role } = useAccess();

  const rawPreset = searchParams.get('range');
  const preset: RangePreset = rawPreset ? parsePreset(rawPreset) : 'month';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const range = useMemo(() => resolveRange(preset, from, to), [preset, from, to]);

  const driverQuery = useDriver(driverId);
  const walletQuery = useDriverWallet(driverId, range);

  const setParams = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === undefined) params.delete(key);
        else params.set(key, value);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  if (!driverId) return <NotFound backHref={backHref} />;

  if (driverQuery.status === 'pending') {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="rounded-card h-44 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="rounded-card h-24 w-full" />
          ))}
        </div>
        <Skeleton className="rounded-card h-96 w-full" />
      </div>
    );
  }

  if (driverQuery.status === 'error') {
    return (
      <Alert status="danger">
        <Alert.Content>
          <Alert.Title>{t('driver.loadError')}</Alert.Title>
          <Alert.Description>{t(parseErrorKey(driverQuery.error, 'fetch'))}</Alert.Description>
        </Alert.Content>
        <Button variant="secondary" size="sm" onPress={() => driverQuery.refetch()}>
          {t('common.retry')}
        </Button>
      </Alert>
    );
  }

  if (!driverQuery.data) return <NotFound backHref={backHref} />;

  return (
    <div className="flex flex-col gap-6">
      <BackLink href={backHref} />
      <WalletPage
        driver={driverQuery.data}
        wallet={walletQuery}
        isAdmin={role === 'admin'}
        range={range}
        onPresetChange={(next) =>
          setParams({
            range: next,
            ...(next === 'custom'
              ? { from: range.from, to: range.to }
              : { from: undefined, to: undefined }),
          })
        }
        onCustomChange={(nextFrom, nextTo) =>
          setParams({ range: 'custom', from: nextFrom, to: nextTo })
        }
      />
    </div>
  );
}

type WalletQuery = ReturnType<typeof useDriverWallet>;

function WalletPage({
  driver,
  wallet,
  isAdmin,
  range,
  onPresetChange,
  onCustomChange,
}: {
  driver: Driver;
  wallet: WalletQuery;
  isAdmin: boolean;
  range: ReturnType<typeof resolveRange>;
  onPresetChange: (preset: RangePreset) => void;
  onCustomChange: (from: string, to: string) => void;
}) {
  const { t, tCount, format } = useI18n();
  const cities = useCities();
  const drivers = useDrivers();
  const topUpDialog = useOverlayState();
  const refundDialog = useOverlayState();
  const adjustDialog = useOverlayState();
  const voidDialog = useOverlayState();
  const [voiding, setVoiding] = useState<LedgerEntryLine | null>(null);

  const cityName = cities.data?.find((city) => city.objectId === driver.city?.objectId)?.name;
  const ref: DriverRef = {
    id: driver.objectId,
    name: formatOrNone(driver.fullname ?? driver.username),
    cityName,
  };
  const driverNames = useMemo(
    () =>
      new Map(
        (drivers.data ?? []).map((d) => [d.objectId, formatOrNone(d.fullname ?? d.username)]),
      ),
    [drivers.data],
  );

  const detail: WalletDetail | undefined = wallet.data;
  const ledger = detail?.ledger ?? null;
  const summary = ledger?.summary ?? null;
  const currency = (summary?.currency ?? detail?.pricing.currency) ?? undefined;
  const isPending = wallet.status === 'pending';
  const isStale = wallet.isPlaceholderData;

  return (
    <>
      <Hero
        driver={driver}
        cityName={cityName}
        detail={detail}
        isPending={isPending}
        actions={
          detail && (
            <>
              <Button variant="primary" size="sm" onPress={topUpDialog.open}>
                <PlusIcon className="size-4" />
                {t('wallet.actions.topUp')}
              </Button>
              {summary && (
                <Button variant="secondary" size="sm" onPress={refundDialog.open}>
                  <RefundIcon className="size-4" />
                  {t('wallet.actions.refund')}
                </Button>
              )}
              {summary && isAdmin && (
                <Button variant="secondary" size="sm" onPress={adjustDialog.open}>
                  <SlidersIcon className="size-4" />
                  {t('wallet.actions.adjust')}
                </Button>
              )}
            </>
          )
        }
      />

      {wallet.status === 'error' && (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>{t('driver.walletError')}</Alert.Title>
            <Alert.Description>{t(walletErrorKey(wallet.error))}</Alert.Description>
          </Alert.Content>
          <Button variant="secondary" size="sm" onPress={() => wallet.refetch()}>
            {t('common.retry')}
          </Button>
        </Alert>
      )}

      {detail && !ledger && (
        <section className="border-border/70 bg-surface rounded-card shadow-card flex flex-col items-center gap-3 border px-6 py-16 text-center">
          <span className="bg-surface-secondary text-muted mb-1 grid size-12 place-items-center rounded-2xl">
            <WalletIcon className="size-6" />
          </span>
          <Typography.Heading level={2} className="text-h5 font-bold">
            {t('driver.noWalletTitle')}
          </Typography.Heading>
          <Typography.Paragraph className="text-muted text-body max-w-prose">
            {t('driver.noWalletBody')}
          </Typography.Paragraph>
          <Button variant="primary" size="sm" onPress={topUpDialog.open} className="mt-2">
            <PlusIcon className="size-4" />
            {t('driver.firstTopUp')}
          </Button>
        </section>
      )}

      {(isPending || ledger) && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={WalletIcon}
              label={t('driver.tiles.left')}
              value={summary ? format.orders(summary.units) : '—'}
              hint={
                summary
                  ? summary.value < 0
                    ? t('driver.tiles.owes', { amount: format.money(-summary.value, currency) })
                    : t('driver.tiles.leftHint', { amount: format.money(summary.value, currency) })
                  : undefined
              }
              isPending={isPending}
            />
            <StatTile
              icon={TagIcon}
              label={t('driver.tiles.price')}
              value={format.money(detail?.pricing.unitPriceToday, currency)}
              hint={t('driver.tiles.priceHint', { city: cityName ?? '—' })}
              isPending={isPending}
            />
            <StatTile
              icon={BikeIcon}
              label={t('driver.tiles.used')}
              value={ledger ? format.orders(ledger.range.used) : '—'}
              hint={
                ledger
                  ? tCount('driver.tiles.deliveries', ledger.range.deliveries, {
                      count: format.number(ledger.range.deliveries),
                      credited: format.orders(ledger.range.credited),
                    })
                  : format.range(range)
              }
              isPending={isPending || isStale}
            />
            <StatTile
              icon={ReceiptIcon}
              label={t('driver.tiles.toppedUp')}
              value={ledger ? format.orders(ledger.range.toppedUp.units) : '—'}
              hint={
                ledger
                  ? t('driver.tiles.toppedUpHint', {
                      received: format.money(ledger.range.toppedUp.amount, currency),
                      refunded: format.money(ledger.range.refunded.amount, currency),
                    })
                  : undefined
              }
              isPending={isPending || isStale}
            />
          </div>

          <section className="border-border/70 bg-surface rounded-card shadow-card overflow-hidden border">
            <header className="border-separator/70 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <h2 className="text-h6 font-bold">{t('wallet.ledger.title')}</h2>
              <DateRangeToolbar
                range={range}
                onPresetChange={onPresetChange}
                onCustomChange={onCustomChange}
              />
            </header>
            {ledger ? (
              <WalletLedgerTable
                ledger={ledger}
                currency={currency}
                isStale={isStale}
                canVoid={isAdmin}
                driverNames={driverNames}
                onVoid={(entry) => {
                  setVoiding(entry);
                  voidDialog.open();
                }}
              />
            ) : (
              <div className="flex flex-col gap-3 p-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {detail && (
        <TopUpDialog
          isOpen={topUpDialog.isOpen}
          onOpenChange={topUpDialog.setOpen}
          driver={ref}
          pricing={detail.pricing}
          hasWallet={!!ledger}
        />
      )}
      {summary && (
        <>
          <RefundDialog
            isOpen={refundDialog.isOpen}
            onOpenChange={refundDialog.setOpen}
            driver={ref}
            summary={summary}
          />
          {isAdmin && (
            <AdjustDialog
              isOpen={adjustDialog.isOpen}
              onOpenChange={adjustDialog.setOpen}
              driver={ref}
              summary={summary}
            />
          )}
        </>
      )}
      {isAdmin && (
        <VoidDialog
          isOpen={voidDialog.isOpen}
          onOpenChange={voidDialog.setOpen}
          entry={voiding}
          currency={currency}
        />
      )}
    </>
  );
}

function Hero({
  driver,
  cityName,
  detail,
  isPending,
  actions,
}: {
  driver: Driver;
  cityName: string | undefined;
  detail: WalletDetail | undefined;
  isPending: boolean;
  actions: React.ReactNode;
}) {
  const { t, format } = useI18n();
  const summary = detail?.ledger?.summary;
  const phones = splitPhones(driver.phone);

  return (
    <section className="border-border/70 bg-surface rounded-card shadow-card relative overflow-hidden border">
      <div
        aria-hidden
        className="brand-gradient absolute inset-x-0 top-0 h-28 opacity-[0.16]"
        style={{ maskImage: 'linear-gradient(to bottom, black, transparent)' }}
      />
      <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
        {driver.picture?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={driver.picture.url}
            alt=""
            className="ring-border/70 shadow-card size-24 shrink-0 rounded-2xl object-cover ring-1"
          />
        ) : (
          <span className="bg-accent-soft text-accent-soft-foreground text-h4 ring-border/70 grid size-24 shrink-0 place-items-center rounded-2xl font-bold ring-1">
            {initials(driver.fullname ?? driver.username)}
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Typography.Heading level={1} className="text-h3 font-bold tracking-tight">
              {formatOrNone(driver.fullname ?? driver.username)}
            </Typography.Heading>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {isPending ? (
              <Skeleton className="rounded-pill h-7 w-28" />
            ) : (
              detail && (
                <WalletStateChip
                  state={driverWalletState(summary ?? undefined)}
                  ordersLeft={summary?.ordersLeft}
                  size="lg"
                />
              )
            )}
            <AccountChip driver={driver} size="lg" />
            {summary && (
              <span className="text-caption text-muted">
                {summary.closedAt
                  ? t('driver.closedOn', { date: format.date(summary.closedAt) })
                  : t('driver.since', { date: format.date(summary.startsAt) })}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-body text-muted flex items-start gap-2">
              <MapPinIcon className="mt-0.5 size-4 shrink-0" />
              <span>{cityName ?? t('drivers.noCity')}</span>
            </span>
            <span className="text-body text-muted flex items-start gap-2">
              <PhoneIcon className="mt-0.5 size-4 shrink-0" />
              {phones.length > 0 ? (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {phones.map((number) => (
                    <a
                      key={number}
                      href={`tel:${number.replace(/\s/g, '')}`}
                      className="tabular text-foreground hover:text-accent-soft-foreground transition-colors"
                    >
                      {number}
                    </a>
                  ))}
                </span>
              ) : (
                <span>—</span>
              )}
            </span>
          </div>

          <code className="text-micro text-muted bg-surface-secondary w-fit rounded-md px-2 py-1">
            {driver.username ?? driver.objectId}
          </code>
        </div>
      </div>
    </section>
  );
}

function NotFound({ backHref }: { backHref: string }) {
  const { t } = useI18n();
  return (
    <div className="border-border/70 bg-surface rounded-card shadow-card flex flex-col items-center gap-3 border px-6 py-20 text-center">
      <span className="bg-surface-secondary text-muted mb-1 grid size-12 place-items-center rounded-2xl">
        <BikeIcon className="size-6" />
      </span>
      <Typography.Heading level={2} className="text-h5 font-bold">
        {t('driver.notFoundTitle')}
      </Typography.Heading>
      <Typography.Paragraph className="text-muted text-body">
        {t('driver.notFoundBody')}
      </Typography.Paragraph>
      <BackLink href={backHref} className="mt-2" />
    </div>
  );
}

function BackLink({ href, className = '' }: { href: string; className?: string }) {
  const { t } = useI18n();
  return (
    <Link
      href={href}
      className={`text-caption text-muted hover:text-foreground hover:border-border-secondary border-border/70 bg-surface focus-visible:ring-focus flex w-fit items-center gap-2 rounded-pill border px-3 py-1.5 font-bold transition-colors outline-none focus-visible:ring-2 ${className}`}
    >
      <ArrowLeftIcon className="size-3.5" />
      {t('driver.back')}
    </Link>
  );
}

/** The list link the user came from, only if it is the drivers list — see the restaurant
 * detail's `safeBackHref`. */
function safeBackHref(raw: string | null): string {
  if (!raw) return DRIVERS_HREF;
  return raw.startsWith(DRIVERS_HREF) ? raw : DRIVERS_HREF;
}
