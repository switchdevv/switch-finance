'use client';

import { useMemo, useState } from 'react';
import { Button, Checkbox, Label, Modal, Skeleton } from '@heroui/react';
import { DEFAULT_EXPORT_FIELDS, EXPORT_FIELDS, type ExportFieldKey } from '@/lib/export/fields';
import { UNCATEGORISED, type OrderCategory } from '@/lib/finance/categories';
import type { DateRange } from '@/lib/finance/date-range';
import { useI18n } from '@/lib/i18n/provider';
import { SheetIcon } from '@/components/icons';

type ExportModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  range: DateRange;
  isExporting: boolean;
  /** The categories the range's orders fall into — see lib/finance/categories.ts. */
  categories: OrderCategory[];
  categoriesStatus: 'pending' | 'error' | 'success';
  onRetryCategories: () => void;
  /** Billable orders an export of these categories would hold; empty is the whole
   * restaurant. Only asked once the categories have loaded, or for the whole restaurant. */
  countOrders: (categoryIds: readonly string[]) => number;
  onExport: (fields: ExportFieldKey[], categoryIds: string[]) => void;
};

/**
 * Category and column picker for the orders spreadsheet.
 *
 * The selection lives here rather than in the URL: it's a property of the file someone
 * is about to make, not of the report on screen, and it deliberately survives closing
 * and reopening the dialog so a second export of a different period doesn't have to be
 * re-configured.
 */
export function ExportModal({
  isOpen,
  onOpenChange,
  range,
  isExporting,
  categories,
  categoriesStatus,
  onRetryCategories,
  countOrders,
  onExport,
}: ExportModalProps) {
  const { t, tCount, format } = useI18n();
  const [fields, setFields] = useState<ExportFieldKey[]>([...DEFAULT_EXPORT_FIELDS]);
  const [pickedCategories, setPickedCategories] = useState<string[]>([]);

  const hasCategories = categoriesStatus === 'success';

  // A pick kept from another period may name a category this one never sold. Once the
  // categories are known it's dropped rather than left ticked out of sight; until then
  // the pick stands, and the export waits for it to be checked.
  const categoryIds = useMemo(
    () =>
      hasCategories
        ? pickedCategories.filter((id) => categories.some((category) => category.id === id))
        : pickedCategories,
    [hasCategories, pickedCategories, categories],
  );

  const isWholeRestaurant = categoryIds.length === 0;
  const canCount = isWholeRestaurant || hasCategories;
  const orderCount = useMemo(
    () => (canCount ? countOrders(categoryIds) : undefined),
    [canCount, countOrders, categoryIds],
  );

  const isAllFieldsSelected = fields.length === EXPORT_FIELDS.length;
  const isAllCategoriesSelected = hasCategories && categoryIds.length === categories.length;

  const toggleField = (key: ExportFieldKey, isSelected: boolean) =>
    setFields((current) =>
      isSelected ? [...current, key] : current.filter((field) => field !== key),
    );

  const toggleCategory = (id: string, isSelected: boolean) =>
    setPickedCategories(
      isSelected ? [...categoryIds, id] : categoryIds.filter((picked) => picked !== id),
    );

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{t('exportDialog.title')}</Modal.Heading>
              <p className="text-caption text-muted">
                {orderCount === undefined
                  ? '…'
                  : tCount('exportDialog.billable', orderCount, {
                      count: format.number(orderCount),
                    })}{' '}
                · {format.range(range)}
              </p>
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
                            setPickedCategories(
                              isAllCategoriesSelected ? [] : categories.map(({ id }) => id),
                            ),
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
                    <p className="text-caption text-muted">
                      {t('exportDialog.categoriesError')}
                    </p>
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
                          {category.id === UNCATEGORISED &&
                            `${t('exportDialog.uncategorisedHint')} · `}
                          {tCount('orders.count', category.orderCount, {
                            count: format.number(category.orderCount),
                          })}
                        </p>
                      </Checkbox>
                    ))}
                  </div>
                )}

                <p className="text-caption text-muted">
                  {isWholeRestaurant
                    ? t('exportDialog.wholeRestaurant')
                    : t('exportDialog.narrowed')}
                </p>
              </section>

              <section className="flex flex-col gap-3">
                <SectionHeader
                  title={t('exportDialog.columns')}
                  action={{
                    label: isAllFieldsSelected
                      ? t('exportDialog.clearAll')
                      : t('exportDialog.selectAll'),
                    onPress: () =>
                      setFields(isAllFieldsSelected ? [] : EXPORT_FIELDS.map((field) => field.key)),
                  }}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  {EXPORT_FIELDS.map((field) => (
                    <Checkbox
                      key={field.key}
                      isSelected={fields.includes(field.key)}
                      onChange={(isSelected) => toggleField(field.key, isSelected)}
                    >
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        <Label>{t(field.label)}</Label>
                      </Checkbox.Content>
                      {field.hint && (
                        <p className="text-caption text-muted ps-7">{t(field.hint)}</p>
                      )}
                    </Checkbox>
                  ))}
                </div>

                {fields.length === 0 && (
                  <p className="text-caption text-muted">
                    {t('exportDialog.needsColumn')}
                  </p>
                )}
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
                isDisabled={fields.length === 0 || isExporting || !orderCount}
                onPress={() => onExport(fields, categoryIds)}
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

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3">
      <p className="text-caption text-muted font-bold tracking-wide uppercase">{title}</p>
      {action && (
        <button
          type="button"
          className="text-caption text-accent focus-visible:ring-focus rounded-pill px-2 py-1 font-bold outline-none focus-visible:ring-2"
          onClick={action.onPress}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
