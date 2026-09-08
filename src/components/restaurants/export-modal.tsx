'use client';

import { useState } from 'react';
import { Button, Checkbox, Label, Modal } from '@heroui/react';
import { DEFAULT_EXPORT_FIELDS, EXPORT_FIELDS, type ExportFieldKey } from '@/lib/export/fields';
import type { DateRange } from '@/lib/finance/date-range';
import { formatNumber } from '@/lib/format';
import { SheetIcon } from '@/components/icons';

type ExportModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  range: DateRange;
  orderCount: number;
  isExporting: boolean;
  onExport: (fields: ExportFieldKey[]) => void;
};

/**
 * Column picker for the orders spreadsheet.
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
  orderCount,
  isExporting,
  onExport,
}: ExportModalProps) {
  const [fields, setFields] = useState<ExportFieldKey[]>([...DEFAULT_EXPORT_FIELDS]);

  const isAllSelected = fields.length === EXPORT_FIELDS.length;

  const toggle = (key: ExportFieldKey, isSelected: boolean) =>
    setFields((current) =>
      isSelected ? [...current, key] : current.filter((field) => field !== key),
    );

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Export orders</Modal.Heading>
              <p className="text-caption text-muted">
                {formatNumber(orderCount)} billable orders · {range.label}
              </p>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-caption text-muted font-bold tracking-wide uppercase">
                  Columns
                </p>
                <button
                  type="button"
                  className="text-caption text-accent focus-visible:ring-focus rounded-pill px-2 py-1 font-bold outline-none focus-visible:ring-2"
                  onClick={() =>
                    setFields(isAllSelected ? [] : EXPORT_FIELDS.map((field) => field.key))
                  }
                >
                  {isAllSelected ? 'Clear all' : 'Select all'}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {EXPORT_FIELDS.map((field) => (
                  <Checkbox
                    key={field.key}
                    isSelected={fields.includes(field.key)}
                    onChange={(isSelected) => toggle(field.key, isSelected)}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Label>{field.label}</Label>
                    </Checkbox.Content>
                    {field.hint && <p className="text-caption text-muted ps-7">{field.hint}</p>}
                  </Checkbox>
                ))}
              </div>

              {fields.length === 0 && (
                <p className="text-caption text-muted">
                  A spreadsheet needs at least one column.
                </p>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="secondary"
                size="sm"
                isDisabled={isExporting}
                onPress={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isDisabled={fields.length === 0 || isExporting}
                onPress={() => onExport(fields)}
              >
                <SheetIcon className="size-4" />
                {isExporting ? 'Preparing…' : 'Export'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
