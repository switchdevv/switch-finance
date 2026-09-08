import type { ReactNode } from 'react';

/** Label/value pair for read-only detail views. Renders "—" for empty/undefined
 * string values so a sparse Parse row never shows a blank cell or "undefined". */
export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  const isEmptyString = typeof children === 'string' && children.trim().length === 0;

  return (
    // Label start / value end on wide screens: the values are the scannable half, so
    // they get a shared alignment edge instead of ragging along behind labels of
    // varying length. Stacks on narrow screens where that edge has no room.
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <span className="text-caption text-muted shrink-0 font-bold tracking-[0.08em] uppercase">
        {label}
      </span>
      <span className="text-body text-foreground min-w-0 sm:max-w-[60%] sm:text-end">
        {isEmptyString ? '—' : children}
      </span>
    </div>
  );
}
