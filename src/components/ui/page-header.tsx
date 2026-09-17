'use client';

import type { ReactNode } from 'react';
import { Typography } from '@heroui/react';
import type { MessageKey } from '@/lib/i18n/dictionary';
import { useI18n } from '@/lib/i18n/provider';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  /** Small uppercase kicker above the title — the section the page belongs to. */
  eyebrow?: MessageKey;
  title: MessageKey;
  description?: MessageKey;
  actions?: ReactNode;
}) {
  // Keys rather than strings: the pages that render this are server components, which
  // can't read the reader's language — this is the first client boundary that can.
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-4 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <span className="text-micro text-accent-soft-foreground font-bold tracking-[0.18em] uppercase">
            {t(eyebrow)}
          </span>
        )}
        <Typography.Heading level={1} className="text-h2 mt-1.5 font-bold tracking-tight">
          {t(title)}
        </Typography.Heading>
        {description && (
          <Typography.Paragraph className="text-muted text-body mt-2 max-w-prose">
            {t(description)}
          </Typography.Paragraph>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
