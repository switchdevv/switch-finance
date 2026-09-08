import type { ReactNode } from 'react';
import { Typography } from '@heroui/react';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  /** Small uppercase kicker above the title — the section the page belongs to. */
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <span className="text-micro text-accent-soft-foreground font-bold tracking-[0.18em] uppercase">
            {eyebrow}
          </span>
        )}
        <Typography.Heading level={1} className="text-h2 mt-1.5 font-bold tracking-tight">
          {title}
        </Typography.Heading>
        {description && (
          <Typography.Paragraph className="text-muted text-body mt-2 max-w-prose">
            {description}
          </Typography.Paragraph>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
