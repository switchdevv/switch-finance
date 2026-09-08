'use client';

import Link from 'next/link';
import { Skeleton } from '@heroui/react';
import { useRestaurantsCount } from '@/hooks/use-restaurants';
import { formatNumber } from '@/lib/format';
import { ChartIcon, ChevronRightIcon, ReceiptIcon, StoreIcon } from '@/components/icons';

const UPCOMING = [
  {
    title: 'Platform reports',
    description:
      'Commission across every restaurant at once. Per-restaurant orders, spreadsheets and invoices are already on each restaurant page.',
    icon: ChartIcon,
  },
  {
    title: 'Payments',
    description: 'Track which commission invoices have been settled.',
    icon: ReceiptIcon,
  },
] as const;

export function DashboardOverview() {
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
            Restaurants on the platform
          </span>
          {countQuery.status === 'pending' ? (
            <Skeleton className="mt-1.5 h-8 w-24 rounded-md" />
          ) : (
            <span className="text-h1 tabular leading-tight font-bold">
              {countQuery.status === 'success' ? formatNumber(countQuery.data) : '—'}
            </span>
          )}
        </span>
        <span className="text-muted group-hover:text-accent-soft-foreground text-caption relative ms-auto flex shrink-0 items-center gap-1.5 font-bold transition-colors">
          <span className="hidden sm:inline">Browse</span>
          <ChevronRightIcon className="size-4" />
        </span>
      </Link>

      <div>
        <h2 className="text-micro text-muted mb-3 font-bold tracking-[0.16em] uppercase">
          Coming soon
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
                <h3 className="text-h6 font-bold">{card.title}</h3>
                <p className="text-muted text-body mt-1">{card.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
