'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Description,
  Label,
  Modal,
  NumberField,
  Switch,
  useOverlayState,
} from '@heroui/react';
import { useAccess } from '@/hooks/use-access';
import { useCities } from '@/hooks/use-cities';
import { useDrivers } from '@/hooks/use-drivers';
import { useDriverWallets, useSaveWalletConfig } from '@/hooks/use-driver-wallets';
import { onlineWithoutEnough, walletSettingsFor } from '@/lib/finance/wallet';
import { useI18n } from '@/lib/i18n/provider';
import { walletErrorKey } from '@/lib/parse/errors';
import type { RegionWalletSettings, WalletConfig, WalletSettings } from '@/types/wallet';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SlidersIcon } from '@/components/icons';

/**
 * Admins' switches for the wallet scheme: whether it is enforced, how many orders going online
 * needs, and when drivers are warned — globally, and per region where a region differs. The
 * global switch is a master switch: off, nothing is enforced anywhere; on, every region is,
 * except one left out. A region's own thresholds replace the global ones for its drivers.
 *
 * Stored in Parse Config `driverWallet` (through `updateConfigs`, admin-only), read by the
 * server on every check — no deploy, no app update. Rendered in the page header, and only for
 * admins: the server refuses anyone else anyway.
 */
export function WalletSettingsButton() {
  const { t } = useI18n();
  const { role } = useAccess();
  const wallets = useDriverWallets();
  const dialog = useOverlayState();

  if (role !== 'admin' || !wallets.data) return null;

  return (
    <>
      <Button variant="secondary" size="sm" onPress={dialog.open}>
        <SlidersIcon className="size-4" />
        {t('wallet.settings.open')}
      </Button>
      <Modal isOpen={dialog.isOpen} onOpenChange={dialog.setOpen}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog>
              {dialog.isOpen && <SettingsForm value={wallets.data.config} onDone={dialog.close} />}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

/** Whole, and the warning at or above the minimum — for a region, once its own values and
 * the global ones are put together. */
function isValid(settings: WalletSettings): boolean {
  return (
    Number.isInteger(settings.minOrders) &&
    settings.minOrders >= 1 &&
    Number.isInteger(settings.lowOrders) &&
    settings.lowOrders >= settings.minOrders
  );
}

/** A region's values with the unset ones dropped, so the saved config only holds real choices. */
function compact(region: RegionWalletSettings): RegionWalletSettings {
  return Object.fromEntries(
    Object.entries(region).filter(([, value]) => value !== undefined),
  ) as RegionWalletSettings;
}

function SettingsForm({ value, onDone }: { value: WalletConfig; onDone: () => void }) {
  const { t, tCount, format } = useI18n();
  const save = useSaveWalletConfig();
  const cities = useCities();
  const drivers = useDrivers();
  const wallets = useDriverWallets();
  const [draft, setDraft] = useState<WalletConfig>(value);

  const setRegion = (cityId: string, next: RegionWalletSettings) => {
    const regions = { ...draft.regions };
    const kept = compact(next);
    if (Object.keys(kept).length > 0) regions[cityId] = kept;
    else delete regions[cityId];
    setDraft({ ...draft, regions });
  };

  // Every region shown is checked with the global values it inherits, so a global change that
  // leaves a region's own warning under its minimum can't be saved either.
  const cityList = cities.data ?? [];
  const valid =
    isValid(draft) &&
    cityList.every((city) => isValid(walletSettingsFor(draft, city.objectId)));

  // Who the new rules would stop at their next attempt to go online: shown before they are
  // saved, so nobody is surprised by a driver calling in.
  const affected = useMemo(() => {
    if (!drivers.data || !wallets.data) return [];
    const byId = new Map(wallets.data.wallets.map((wallet) => [wallet.driverId, wallet]));
    return onlineWithoutEnough(drivers.data, byId, draft);
  }, [draft, drivers.data, wallets.data]);

  const orders = (count: number) => tCount('wallet.orders', count, { count: format.number(count) });

  return (
    <>
      <Modal.Header>
        <Modal.Heading>{t('wallet.settings.title')}</Modal.Heading>
        <p className="text-caption text-muted">{t('wallet.settings.subtitle')}</p>
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <SectionHeader title={t('wallet.settings.global')} />
          <Switch
            isSelected={draft.enforced}
            onChange={(enforced) => setDraft({ ...draft, enforced })}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Label className="text-body font-bold">{t('wallet.settings.enforced')}</Label>
            </Switch.Content>
            <Description>{t('wallet.settings.enforcedHint')}</Description>
          </Switch>

          <div className="grid gap-3 sm:grid-cols-2">
            <CountField
              label={t('wallet.settings.minOrders')}
              value={draft.minOrders}
              onChange={(minOrders) => setDraft({ ...draft, minOrders: minOrders ?? 0 })}
            />
            <CountField
              label={t('wallet.settings.lowOrders')}
              value={draft.lowOrders}
              onChange={(lowOrders) => setDraft({ ...draft, lowOrders: lowOrders ?? 0 })}
            />
          </div>
          <p className="text-caption text-muted">
            {isValid(draft)
              ? t('wallet.settings.summary', {
                  min: orders(draft.minOrders),
                  low: orders(draft.lowOrders),
                })
              : t('wallet.settings.invalid')}
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeader title={t('wallet.settings.regions')} />
          <p className="text-caption text-muted">{t('wallet.settings.regionsHint')}</p>
          {cityList.map((city) => (
            <RegionRow
              key={city.objectId}
              name={city.name ?? '—'}
              global={draft}
              region={draft.regions[city.objectId] ?? {}}
              effective={walletSettingsFor(draft, city.objectId)}
              onChange={(next) => setRegion(city.objectId, next)}
            />
          ))}
        </section>

        {affected.length > 0 && (
          <Alert status="warning">
            <Alert.Content>
              <Alert.Description>
                {tCount('wallet.settings.affected', affected.length, {
                  count: format.number(affected.length),
                })}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {save.isError && (
          <Alert status="danger">
            <Alert.Content>
              <Alert.Description>{t(walletErrorKey(save.error))}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" size="sm" isDisabled={save.isPending} onPress={onDone}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          isDisabled={!valid || save.isPending}
          onPress={() => save.mutate(draft, { onSuccess: onDone })}
        >
          {save.isPending ? t('wallet.saving') : t('wallet.settings.submit')}
        </Button>
      </Modal.Footer>
    </>
  );
}

type RegionEnforcement = 'included' | 'leftOut';

/**
 * One region: included in the global switch or left out of it, and its own thresholds. An
 * empty threshold follows the global one, shown as its placeholder.
 */
function RegionRow({
  name,
  global,
  region,
  effective,
  onChange,
}: {
  name: string;
  global: WalletSettings;
  region: RegionWalletSettings;
  /** What the region's drivers are held to: its own values over the global ones. */
  effective: WalletSettings;
  onChange: (region: RegionWalletSettings) => void;
}) {
  const { t, tCount, format } = useI18n();
  // Only "left out" is stored: included is what a region is by default.
  const mode: RegionEnforcement = region.enforced === false ? 'leftOut' : 'included';
  const orders = (count: number) => tCount('wallet.orders', count, { count: format.number(count) });

  return (
    <div className="border-border/70 rounded-card flex flex-col gap-3 border px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="text-body font-bold">{name}</span>
          <span className="text-caption text-muted">
            {!isValid(effective)
              ? t('wallet.settings.invalid')
              : effective.enforced
                ? t('wallet.settings.regionOn', {
                    min: orders(effective.minOrders),
                    low: orders(effective.lowOrders),
                  })
                : mode === 'leftOut'
                  ? t('wallet.settings.regionLeftOut')
                  : t('wallet.settings.regionOff')}
          </span>
        </span>
        <SegmentedControl
          label={t('wallet.settings.regionEnforcement', { name })}
          options={[
            { key: 'included', label: t('wallet.settings.included') },
            { key: 'leftOut', label: t('wallet.settings.leftOut') },
          ]}
          value={mode}
          onChange={(next) =>
            onChange({ ...region, enforced: next === 'leftOut' ? false : undefined })
          }
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <CountField
          label={t('wallet.settings.minOrders')}
          value={region.minOrders}
          placeholder={format.number(global.minOrders)}
          onChange={(minOrders) => onChange({ ...region, minOrders })}
        />
        <CountField
          label={t('wallet.settings.lowOrders')}
          value={region.lowOrders}
          placeholder={format.number(global.lowOrders)}
          onChange={(lowOrders) => onChange({ ...region, lowOrders })}
        />
      </div>
    </div>
  );
}

/** A count; `undefined` is an empty field — for a region, "the global value". */
function CountField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | undefined;
  placeholder?: string;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <NumberField
      // NaN is how the field is told it's empty.
      value={value ?? Number.NaN}
      onChange={(next) => onChange(Number.isFinite(next) ? next : undefined)}
      minValue={1}
      maxValue={1000}
      step={1}
      formatOptions={{ maximumFractionDigits: 0 }}
      fullWidth
    >
      <Label>{label}</Label>
      <NumberField.Group>
        <NumberField.DecrementButton />
        <NumberField.Input placeholder={placeholder} />
        <NumberField.IncrementButton />
      </NumberField.Group>
    </NumberField>
  );
}
