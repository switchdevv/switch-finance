'use client';

/**
 * A small row of mutually exclusive options — date presets, billable/all.
 *
 * Plain buttons rather than a component-library tab set: the pagination bar already
 * establishes this pattern in the codebase, the two segments here carry no panels to
 * associate with, and the tokens below are the same ones the pager uses, so the two
 * controls sit on a page together without looking like they came from different kits.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  isDisabled,
}: {
  label: string;
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  isDisabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="bg-surface-secondary border-border/70 inline-flex w-fit items-center gap-0.5 rounded-pill border p-1"
    >
      {options.map((option) => {
        const isSelected = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={isDisabled}
            onClick={() => onChange(option.key)}
            className={
              'text-caption focus-visible:ring-focus rounded-pill px-3 py-1.5 font-bold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 disabled:opacity-50 ' +
              (isSelected
                ? 'bg-surface text-foreground shadow-card'
                : 'text-muted hover:text-foreground')
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
