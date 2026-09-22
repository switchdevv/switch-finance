'use client';

import { Input, Label, NumberField, TextField } from '@heroui/react';
import type { CarryOver } from '@/lib/finance/carry-over';
import { useI18n } from '@/lib/i18n/provider';
import type { CurrencyCode } from '@/types/city';

/**
 * The manual "still owed from before" entry, shared by the invoice's print dialog and the
 * spreadsheet's export dialog so the two can't offer it on different terms.
 *
 * It's a plain pair of fields rather than anything cleverer because there is nothing to
 * look it up against: Parse records what was ordered, never what was paid, so whoever is
 * sending the document is the only source for this figure.
 */
export function CarryOverFields({
  value,
  currency,
  onChange,
}: {
  value: CarryOver;
  currency: CurrencyCode | undefined;
  onChange: (next: CarryOver) => void;
}) {
  const { t, format } = useI18n();

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          value={value.amount}
          // An empty field comes back as NaN; that's "nothing outstanding", not a figure
          // to put on an invoice.
          onChange={(amount) =>
            onChange({ ...value, amount: Number.isFinite(amount) ? amount : 0 })
          }
          minValue={0}
          step={1}
          formatOptions={{ maximumFractionDigits: 0 }}
          fullWidth
        >
          <Label>{t('carryOver.amount')}</Label>
          <NumberField.Group>
            <NumberField.Input placeholder="0" />
          </NumberField.Group>
        </NumberField>

        <TextField
          value={value.note}
          onChange={(note) => onChange({ ...value, note })}
          // Nothing is owed, so there is nothing for a note to describe.
          isDisabled={value.amount <= 0}
          fullWidth
        >
          <Label>{t('carryOver.note')}</Label>
          <Input placeholder={t('carryOver.notePlaceholder')} />
        </TextField>
      </div>

      <p className="text-caption text-muted">
        {value.amount > 0
          ? t('carryOver.included', { amount: format.money(value.amount, currency) })
          : t('carryOver.hint')}
      </p>
    </div>
  );
}
