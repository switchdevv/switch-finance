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
import { useDrivers } from '@/hooks/use-drivers';
import { useDriverWallets, useSaveWalletSettings } from '@/hooks/use-driver-wallets';
import { onlineWithoutEnough } from '@/lib/finance/wallet';
import { useI18n } from '@/lib/i18n/provider';
import { walletErrorKey } from '@/lib/parse/errors';
import type { WalletSettings } from '@/types/wallet';
import { SlidersIcon } from '@/components/icons';

/**
 * Admins' switch for the whole wallet scheme: whether it is enforced, how many orders going
 * online needs, and when drivers are warned. Stored in Parse Config `driverWallet` (through
 * `updateConfigs`, admin-only), read by the server on every check — no deploy needed.
 *
 * Rendered in the page header, and only for admins: the server refuses anyone else anyway.
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
          <Modal.Container size="md">
            <Modal.Dialog>
              {dialog.isOpen && (
                <SettingsForm value={wallets.data.settings} onDone={dialog.close} />
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

function SettingsForm({ value, onDone }: { value: WalletSettings; onDone: () => void }) {
  const { t, tCount, format } = useI18n();
  const save = useSaveWalletSettings();
  const drivers = useDrivers();
  const wallets = useDriverWallets();
  const [draft, setDraft] = useState<WalletSettings>(value);

  // Who the new rule would stop at their next attempt to go online: shown before it is
  // turned on, so nobody is surprised by a driver calling in.
  const affected = useMemo(() => {
    if (!draft.enforced || !drivers.data || !wallets.data) return [];
    const byId = new Map(wallets.data.wallets.map((wallet) => [wallet.driverId, wallet]));
    return onlineWithoutEnough(drivers.data, byId, draft);
  }, [draft, drivers.data, wallets.data]);

  const valid =
    Number.isInteger(draft.minOrders) &&
    draft.minOrders >= 1 &&
    Number.isInteger(draft.lowOrders) &&
    draft.lowOrders >= draft.minOrders;

  const orders = (count: number) => tCount('wallet.orders', count, { count: format.number(count) });

  return (
    <>
      <Modal.Header>
        <Modal.Heading>{t('wallet.settings.title')}</Modal.Heading>
        <p className="text-caption text-muted">{t('wallet.settings.subtitle')}</p>
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-5">
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
            onChange={(minOrders) => setDraft({ ...draft, minOrders })}
          />
          <CountField
            label={t('wallet.settings.lowOrders')}
            value={draft.lowOrders}
            onChange={(lowOrders) => setDraft({ ...draft, lowOrders })}
          />
        </div>
        <p className="text-caption text-muted">
          {valid
            ? t('wallet.settings.summary', {
                min: orders(draft.minOrders),
                low: orders(draft.lowOrders),
              })
            : t('wallet.settings.invalid')}
        </p>

        {affected.length > 0 && (
          <Alert status="warning">
            <Alert.Content>
              <Alert.Description>
                {tCount('wallet.settings.affected', affected.length, {
                  count: format.number(affected.length),
                  min: orders(draft.minOrders),
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

function CountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <NumberField
      value={value}
      onChange={(next) => onChange(Number.isFinite(next) ? next : 0)}
      minValue={1}
      maxValue={1000}
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
