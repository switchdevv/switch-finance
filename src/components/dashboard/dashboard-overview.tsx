'use client';

import Link from 'next/link';
import { Skeleton } from '@heroui/react';
import { useRestaurantsCount } from '@/hooks/use-restaurants';
import { useI18n } from '@/lib/i18n/provider';
import { ChartIcon, ChevronRightIcon, ReceiptIcon, StoreIcon } from '@/components/icons';

const UPCOMING = [
  {
    title: 'dashboard.reportsTitle',
    description: 'dashboard.reportsBody',
    icon: ChartIcon,
  },
  {
    title: 'dashboard.paymentsTitle',
    description: 'dashboard.paymentsBody',
    icon: ReceiptIcon,
  },
] as const;

export function DashboardOverview() {
  const { t, format } = useI18n();
  // Reuses the list page's count query, so landing here warms the cache the
  // restaurants table reads a moment later rather than costing an extra round-trip.
  const countQuery = useRestaurantsCount();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/restaurants"
        className="group border-border/70 bg-surface rounded-card shadow-card hover:border-border-secondary focus-visible:ring-focus relative flex items-center gap-5 overflow-hidden border p-6 transition-colors outline-none focus-visible:ring-2"
      >
        <span
          aria-hidden
          className="brand-gradient pointer-events-none absolute inset-0 opacity-[0.08]"
        />
        <span className="brand-gradient shadow-accent relative grid size-12 shrink-0 place-items-center rounded-2xl text-white">
          <StoreIcon className="size-6" />
        </span>
        <span className="relative flex min-w-0 flex-col">
          <span className="text-caption text-muted font-bold tracking-[0.08em] uppercase">
            {t('dashboard.restaurantsCount')}
          </span>
          {countQuery.status === 'pending' ? (
            <Skeleton className="mt-1.5 h-8 w-24 rounded-md" />
          ) : (
            <span className="text-h1 tabular leading-tight font-bold">
              {countQuery.status === 'success' ? format.number(countQuery.data) : '—'}
            </span>
          )}
        </span>
        <span className="text-muted group-hover:text-accent-soft-foreground text-caption relative ms-auto flex shrink-0 items-center gap-1.5 font-bold transition-colors">
          <span className="hidden sm:inline">{t('dashboard.browse')}</span>
          <ChevronRightIcon className="size-4" />
        </span>
      </Link>

      <div>
        <h2 className="text-micro text-muted mb-3 font-bold tracking-[0.16em] uppercase">
          {t('dashboard.comingSoon')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {UPCOMING.map((card) => (
            <article
              key={card.title}
              className="border-border/70 bg-surface rounded-card shadow-card flex flex-col gap-3 border p-6"
            >
              <span className="bg-surface-secondary text-muted grid size-10 place-items-center rounded-xl">
                <card.icon className="size-5" />
              </span>
              <div>
                <h3 className="text-h6 font-bold">{t(card.title)}</h3>
                <p className="text-muted text-body mt-1">{t(card.description)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
