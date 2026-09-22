'use client';

import { useMemo, useState } from 'react';
import { Button, Checkbox, Label, Modal, Skeleton } from '@heroui/react';
import { CarryOverFields } from '@/components/ui/carry-over-fields';
import { SectionHeader } from '@/components/ui/section-header';
import { PrinterIcon } from '@/components/icons';
import { UNCATEGORISED, type OrderCategory } from '@/lib/finance/categories';
import { INVOICE_COLUMNS, type InvoiceColumnKey } from '@/lib/invoice/columns';
import type { InvoiceOptions } from '@/lib/invoice/options';
import { useI18n } from '@/lib/i18n/provider';
import type { CurrencyCode } from '@/types/city';

/**
 * Where the dialog was opened from, which is the only thing that differs between its two
 * uses: `open` is the Invoice button on the restaurant page, which has no document yet
 * and ends by opening one; `print` is the document itself, which ends at the printer.
 */
export type InvoiceIntent = 'open' | 'print';

type InvoiceOptionsModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  intent: InvoiceIntent;
  /** The options to open on. The dialog works on a copy, so closing it without
   * confirming changes nothing. */
  value: InvoiceOptions;
  categories: OrderCategory[];
  categoriesStatus: 'pending' | 'error' | 'success';
  onRetryCategories: () => void;
  currency: CurrencyCode | undefined;
  /** Hands back the choices — to open the document, or to print the one on screen. */
  onConfirm: (options: InvoiceOptions) => void;
};

/**
 * What the invoice is of, before it exists: which part of the restaurant, which columns,
 * and anything still owed from before the period.
 *
 * It mirrors the spreadsheet's export dialog on purpose — the same restaurant gets billed
 * on paper and reconciled in a sheet, and the two should ask the same questions in the
 * same order. It is the same dialog in both of its own uses too, so the invoice can be
 * adjusted on the document without going back to the restaurant page to do it.
 */
export function InvoiceOptionsModal(props: InvoiceOptionsModalProps) {
  return (
    <Modal isOpen={props.isOpen} onOpenChange={props.onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            {/* Mounted only while open, so every opening starts from the document's
                current options rather than from whatever was last typed and abandoned. */}
            {props.isOpen && <OptionsForm {...props} />}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function OptionsForm({
  onOpenChange,
  intent,
  value,
  categories,
  categoriesStatus,
  onRetryCategories,
  currency,
  onConfirm,
}: InvoiceOptionsModalProps) {
  const { t, tCount, format } = useI18n();
  const [draft, setDraft] = useState<InvoiceOptions>(value);

  const hasCategories = categoriesStatus === 'success';

  // A link may name a section this period never sold, or one that has since been
  // renamed away. Once the sections are known the pick is shown against them rather
  // than left ticked out of sight.
  const categoryIds = useMemo(
    () =>
      hasCategories
        ? draft.categoryIds.filter((id) => categories.some((category) => category.id === id))
        : draft.categoryIds,
    [hasCategories, draft.categoryIds, categories],
  );

  const isAllCategoriesSelected = hasCategories && categoryIds.length === categories.length;
  const isAllColumnsSelected = draft.columns.length === INVOICE_COLUMNS.length;

  const toggleCategory = (id: string, isSelected: boolean) =>
    setDraft((current) => ({
      ...current,
      categoryIds: isSelected ? [...categoryIds, id] : categoryIds.filter((picked) => picked !== id),
    }));

  const toggleColumn = (key: InvoiceColumnKey, isSelected: boolean) =>
    setDraft((current) => ({
      ...current,
      columns: isSelected
        ? [...current.columns, key]
        : current.columns.filter((column) => column !== key),
    }));

  return (
    <>
      <Modal.Header>
        <Modal.Heading>{t(`invoiceDialog.title.${intent}`)}</Modal.Heading>
        <p className="text-caption text-muted">{t(`invoiceDialog.subtitle.${intent}`)}</p>
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <SectionHeader
            title={t('exportDialog.categories')}
            action={
              hasCategories && categories.length > 1
                ? {
                    label: isAllCategoriesSelected
                      ? t('exportDialog.clearAll')
                      : t('exportDialog.selectAll'),
                    onPress: () =>
                      setDraft((current) => ({
                        ...current,
                        categoryIds: isAllCategoriesSelected
                          ? []
                          : categories.map(({ id }) => id),
                      })),
                  }
                : undefined
            }
          />

          {categoriesStatus === 'pending' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-40 rounded-md" />
              ))}
            </div>
          )}

          {categoriesStatus === 'error' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-caption text-muted">{t('exportDialog.categoriesError')}</p>
              <Button variant="secondary" size="sm" onPress={onRetryCategories}>
                {t('common.retry')}
              </Button>
            </div>
          )}

          {hasCategories && (
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((category) => (
                <Checkbox
                  key={category.id}
                  isSelected={categoryIds.includes(category.id)}
                  onChange={(isSelected) => toggleCategory(category.id, isSelected)}
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Label>{category.name}</Label>
                  </Checkbox.Content>
                  <p className="text-caption text-muted ps-7">
                    {category.id === UNCATEGORISED && `${t('exportDialog.uncategorisedHint')} · `}
                    {tCount('orders.count', category.orderCount, {
                      count: format.number(category.orderCount),
                    })}
                  </p>
                </Checkbox>
              ))}
            </div>
          )}

          <p className="text-caption text-muted">
            {categoryIds.length === 0
              ? t('invoiceDialog.wholeRestaurant')
              : t('invoiceDialog.narrowed')}
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeader
            title={t('exportDialog.columns')}
            action={{
              label: isAllColumnsSelected
                ? t('exportDialog.clearAll')
                : t('exportDialog.selectAll'),
              onPress: () =>
                setDraft((current) => ({
                  ...current,
                  columns: isAllColumnsSelected ? [] : INVOICE_COLUMNS.map(({ key }) => key),
                })),
            }}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {INVOICE_COLUMNS.map((column) => (
              <Checkbox
                key={column.key}
                isSelected={draft.columns.includes(column.key)}
                onChange={(isSelected) => toggleColumn(column.key, isSelected)}
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

          {/* Unlike the spreadsheet, dropping every column is allowed: an invoice with no
              line-item table is still a valid invoice — just the summary and the total. */}
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
          />
        </section>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" size="sm" onPress={() => onOpenChange(false)}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          isDisabled={!hasCategories && draft.categoryIds.length > 0}
          onPress={() => onConfirm({ ...draft, categoryIds })}
        >
          <PrinterIcon className="size-4" />
          {t(`invoiceDialog.submit.${intent}`)}
        </Button>
      </Modal.Footer>
    </>
  );
}
