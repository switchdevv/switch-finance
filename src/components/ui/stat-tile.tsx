import type { ComponentType, SVGProps } from 'react';
import { Skeleton } from '@heroui/react';

/** The headline-figure card used across the restaurant report. */
export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  isPending,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  hint?: string;
  isPending?: boolean;
}) {
  return (
    <div className="border-border/70 bg-surface rounded-card shadow-card flex flex-col gap-3 border p-5">
      <span className="flex items-center gap-2">
        <span className="bg-accent-soft text-accent-soft-foreground grid size-8 place-items-center rounded-lg">
          <Icon className="size-4" />
        </span>
        <span className="text-caption text-muted font-bold tracking-[0.08em] uppercase">
          {label}
        </span>
      </span>
      <span className="flex flex-col">
        {isPending ? (
          <Skeleton className="h-8 w-28 rounded-md" />
        ) : (
          <span className="text-h4 tabular leading-tight font-bold">{value}</span>
        )}
        {hint && <span className="text-caption text-muted mt-0.5">{hint}</span>}
      </span>
    </div>
  );
}
