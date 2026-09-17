'use client';

import type { ReactNode } from 'react';
import { useAccess } from '@/hooks/use-access';
import { useI18n } from '@/lib/i18n/provider';
import { ShieldIcon } from './icons';

/**
 * The second, narrower gate: admin-only page bodies.
 *
 * Wraps a page rather than a layout because /access is the only route that needs it, and
 * because RequireAuth has already established there's a session and some level of access
 * by the time this renders — this only has to separate `admin` from `member`. The nav
 * item is hidden for members too (see app-shell), but hiding a link is not a check: the
 * URL is typeable.
 *
 * Renders inline rather than reusing NotAuthorized: this sits inside AppShell's <main>,
 * where that component's full-viewport centring would overflow the page, and where its
 * Sign out button would be the second one on screen.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const access = useAccess();

  // Both queries behind this are already warm from RequireAuth, so in practice this
  // branch only shows on a hard reload straight onto /access.
  if (access.isPending) {
    return <div className="border-border/70 rounded-card h-64 animate-pulse border" />;
  }

  if (access.role !== 'admin') {
    return (
      <section className="border-border/70 bg-surface rounded-card shadow-card flex flex-col items-center gap-2 border px-6 py-20 text-center">
        <span className="bg-surface-secondary text-muted mb-2 grid size-12 place-items-center rounded-2xl">
          <ShieldIcon className="size-6" />
        </span>
        <p className="text-h6 font-bold">{t('gate.adminsOnlyTitle')}</p>
        <p className="text-muted text-body max-w-prose">
          {t('gate.adminsOnlyBody')}
        </p>
      </section>
    );
  }

  return <>{children}</>;
}
