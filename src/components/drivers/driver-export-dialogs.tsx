'use client';

import { useState } from 'react';
import { Button, Checkbox, Label, Modal } from '@heroui/react';
import { DEFAULT_DRIVER_FIELDS, DRIVER_FIELDS, type DriverFieldKey } from '@/lib/export/driver-fields';
import { NO_CARRY_OVER, type CarryOver } from '@/lib/finance/carry-over';
import type { DateRange } from '@/lib/finance/date-range';
import {
  STATEMENT_COLUMNS,
  STATEMENT_MODES,
  type StatementColumnKey,
  type StatementMode,
  type StatementOptions,
} from '@/lib/invoice/driver-statement';
import { useI18n } from '@/lib/i18n/provider';
import type { CurrencyCode } from '@/types/city';
import { CarryOverFields } from '@/components/ui/carry-over-fields';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { PrinterIcon, SheetIcon } from '@/components/icons';

/**
 * The spreadsheet's column picker for a driver — the restaurant export dialog without the
 * categories, which a driver doesn't have. The columns survive the dialog closing; the
 * carry-over doesn't (see ExportModal).
 */
export function DriverExportModal({
  isOpen,
  onOpenChange,
  range,
  deliveries,
  isExporting,
  currency,
  onExport,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  range: DateRange;
  deliveries: number;
  isExporting: boolean;
  currency: CurrencyCode | undefined;
  onExport: (fields: DriverFieldKey[], carryOver: CarryOver) => void;
}) {
  const { t, tCount, format } = useI18n();
  const [fields, setFields] = useState<DriverFieldKey[]>([...DEFAULT_DRIVER_FIELDS]);
  const [carryOver, setCarryOver] = useState<CarryOver>(NO_CARRY_OVER);
  const isAll = fields.length === DRIVER_FIELDS.length;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(next) => {
        if (!next) setCarryOver(NO_CARRY_OVER);
        onOpenChange(next);
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{t('driverFinance.exportTitle')}</Modal.Heading>
              <p className="text-caption text-muted">
                {tCount('driverFinance.deliveries', deliveries, {
                  count: format.number(deliveries),
                })}{' '}
                · {format.range(range)}
              </p>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-6">
              <section className="flex flex-col gap-3">
                <SectionHeader
                  title={t('exportDialog.columns')}
                  action={{
                    label: isAll ? t('exportDialog.clearAll') : t('exportDialog.selectAll'),
                    onPress: () => setFields(isAll ? [] : DRIVER_FIELDS.map((field) => field.key)),
                  }}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {DRIVER_FIELDS.map((field) => (
                    <Checkbox
                      key={field.key}
                      isSelected={fields.includes(field.key)}
                      onChange={(isSelected) =>
                        setFields((current) =>
                          isSelected ? [...current, field.key] : current.filter((key) => key !== field.key),
                        )
                      }
                    >
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        <Label>{t(field.label)}</Label>
                      </Checkbox.Content>
                      {field.hint && <p className="text-caption text-muted ps-7">{t(field.hint)}</p>}
                    </Checkbox>
                  ))}
                </div>
                {fields.length === 0 && (
                  <p className="text-caption text-muted">{t('exportDialog.needsColumn')}</p>
                )}
                <p className="text-caption text-muted">{t('driverFinance.exportDaily')}</p>
              </section>

              <section className="flex flex-col gap-3">
                <SectionHeader title={t('carryOver.section')} />
                <CarryOverFields
                  value={carryOver}
                  currency={currency}
                  onChange={setCarryOver}
                  hintKey="driverFinance.carryOverHint"
                  includedKey="driverFinance.carryOverIncluded"
                />
              </section>
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="secondary"
                size="sm"
                isDisabled={isExporting}
                onPress={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                isDisabled={fields.length === 0 || isExporting || deliveries === 0}
                onPress={() => onExport(fields, carryOver)}
              >
                <SheetIcon className="size-4" />
                {isExporting ? t('common.preparing') : t('exportDialog.export')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

type StatementDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** `open` from the Finance tab (ends by opening the document), `print` on the document. */
  intent: 'open' | 'print';
  value: StatementOptions;
  /** Offered only where the document isn't on screen yet — the document has its own toggle. */
  mode?: StatementMode;
  currency: CurrencyCode | undefined;
  onConfirm: (options: StatementOptions, mode: StatementMode) => void;
};

/** What goes on a driver's printed statement: which one, its columns, anything carried over. */
export function DriverStatementModal(props: StatementDialogProps) {
  return (
    <Modal isOpen={props.isOpen} onOpenChange={props.onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>{props.isOpen && <StatementForm {...props} />}</Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function StatementForm({ onOpenChange, intent, value, mode, currency, onConfirm }: StatementDialogProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<StatementOptions>(value);
  const [pickedMode, setPickedMode] = useState<StatementMode>(mode ?? 'settlement');
  const isAll = draft.columns.length === STATEMENT_COLUMNS.length;

  const toggle = (key: StatementColumnKey, isSelected: boolean) =>
    setDraft((current) => ({
      ...current,
      columns: isSelected ? [...current.columns, key] : current.columns.filter((column) => column !== key),
    }));

  return (
    <>
      <Modal.Header>
        <Modal.Heading>{t(`driverStatement.dialog.title.${intent}`)}</Modal.Heading>
        <p className="text-caption text-muted">{t(`invoiceDialog.subtitle.${intent}`)}</p>
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-6">
        {mode !== undefined && (
          <section className="flex flex-col gap-3">
            <SectionHeader title={t('driverStatement.modeLabel')} />
            <SegmentedControl
              label={t('driverStatement.modeLabel')}
              options={STATEMENT_MODES.map((key) => ({ key, label: t(`driverStatement.modes.${key}`) }))}
              value={pickedMode}
              onChange={setPickedMode}
            />
            <p className="text-caption text-muted">{t(`driverStatement.modeHints.${pickedMode}`)}</p>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <SectionHeader
            title={t('exportDialog.columns')}
            action={{
              label: isAll ? t('exportDialog.clearAll') : t('exportDialog.selectAll'),
              onPress: () =>
                setDraft((current) => ({
                  ...current,
                  columns: isAll ? [] : STATEMENT_COLUMNS.map(({ key }) => key),
                })),
            }}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {STATEMENT_COLUMNS.map((column) => (
              <Checkbox
                key={column.key}
                isSelected={draft.columns.includes(column.key)}
                onChange={(isSelected) => toggle(column.key, isSelected)}
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Label>{t(column.label)}</Label>
                </Checkbox.Content>
              </Checkbox>
            ))}
          </div>
          {draft.columns.length === 0 && (
            <p className="text-caption text-muted">{t('invoiceDialog.noColumns')}</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeader title={t('carryOver.section')} />
          <CarryOverFields
            value={draft.carryOver}
            currency={currency}
            onChange={(carryOver) => setDraft((current) => ({ ...current, carryOver }))}
            hintKey="driverFinance.carryOverHint"
            includedKey="driverFinance.carryOverIncluded"
          />
        </section>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" size="sm" onPress={() => onOpenChange(false)}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="sm" onPress={() => onConfirm(draft, pickedMode)}>
          <PrinterIcon className="size-4" />
          {t(`driverStatement.dialog.submit.${intent}`)}
        </Button>
      </Modal.Footer>
    </>
  );
}
