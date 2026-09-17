'use client';

import { RANGE_PRESETS, type DateRange, type RangePreset } from '@/lib/finance/date-range';
import { useI18n } from '@/lib/i18n/provider';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { CalendarIcon } from '@/components/icons';

/**
 * Preset picker plus, for `custom`, a pair of date inputs.
 *
 * Native `<input type="date">` rather than a popover calendar: it is keyboard- and
 * locale-native, it opens the platform's own picker on every device including phones,
 * and it can't get into a half-selected state the way a range calendar can while the
 * user is mid-drag. The value format (YYYY-MM-DD) is also exactly what the URL and the
 * range resolver already speak, so nothing is translated between them.
 */
export function DateRangeToolbar({
  range,
  onPresetChange,
  onCustomChange,
}: {
  range: DateRange;
  onPresetChange: (preset: RangePreset) => void;
  onCustomChange: (from: string, to: string) => void;
}) {
  const { t, format } = useI18n();
  const presets = RANGE_PRESETS.map((key) => ({ key, label: t(`range.presets.${key}`) }));

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SegmentedControl
        label={t('range.label')}
        options={presets}
        value={range.preset}
        onChange={onPresetChange}
      />

      {range.preset === 'custom' ? (
        <div className="flex items-center gap-2">
          <DateInput
            label={t('range.from')}
            value={range.from}
            max={range.to}
            onChange={(value) => onCustomChange(value, range.to)}
          />
          <span className="text-muted text-caption">–</span>
          <DateInput
            label={t('range.to')}
            value={range.to}
            min={range.from}
            onChange={(value) => onCustomChange(range.from, value)}
          />
        </div>
      ) : (
        <span className="text-caption text-muted flex items-center gap-1.5">
          <CalendarIcon className="size-3.5" />
          {format.range(range)}
        </span>
      )}
    </div>
  );
}

function DateInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-micro text-muted font-bold tracking-[0.08em] uppercase">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        // An empty value means the user cleared the field mid-edit; committing that would
        // resolve to "today" and yank the report out from under them.
        onChange={(event) => event.target.value && onChange(event.target.value)}
        className="text-caption tabular border-border/70 bg-surface focus-visible:ring-focus rounded-lg border px-2.5 py-1.5 outline-none focus-visible:ring-2"
      />
    </label>
  );
}
