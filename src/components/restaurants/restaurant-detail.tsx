'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Alert, Button, Chip, Skeleton, Typography } from '@heroui/react';
import { useRestaurant } from '@/hooks/use-restaurants';
import { formatDateTime, formatNumber, formatOrNone, splitPhones } from '@/lib/format';
import { parseErrorMessage } from '@/lib/parse/errors';
import type { RestaurantWithRelations } from '@/types/restaurant';
import { StatusChip } from '@/components/ui/status-chip';
import { OrdersPanel } from '@/components/restaurants/orders-panel';
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PhoneIcon,
  StarIcon,
  StoreIcon,
} from '@/components/icons';

export function RestaurantDetail({ objectId }: { objectId: string }) {
  const searchParams = useSearchParams();
  const backHref = safeBackHref(searchParams.get('back'));

  const { status, data: restaurant, error, refetch } = useRestaurant(objectId);

  if (status === 'pending') {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="rounded-card h-44 w-full" />
        <Skeleton className="rounded-card h-16 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="rounded-card h-24 w-full" />
          ))}
        </div>
        <Skeleton className="rounded-card h-96 w-full" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <Alert status="danger">
        <Alert.Content>
          <Alert.Title>Couldn&apos;t load this restaurant</Alert.Title>
          <Alert.Description>{parseErrorMessage(error, 'fetch')}</Alert.Description>
        </Alert.Content>
        <Button variant="secondary" size="sm" onPress={() => refetch()}>
          Retry
        </Button>
      </Alert>
    );
  }

  // findOne() resolves null rather than throwing on a missing row — see the note on
  // lib/parse/query.ts#findOne — so a bad objectId lands here, not in the error
  // branch above.
  if (!restaurant) {
    return (
      <div className="border-border/70 bg-surface rounded-card shadow-card flex flex-col items-center gap-3 border px-6 py-20 text-center">
        <span className="bg-surface-secondary text-muted mb-1 grid size-12 place-items-center rounded-2xl">
          <StoreIcon className="size-6" />
        </span>
        <Typography.Heading level={2} className="text-h5 font-bold">
          Restaurant not found
        </Typography.Heading>
        <Typography.Paragraph className="text-muted text-body">
          It may have been removed, or the link is incorrect.
        </Typography.Paragraph>
        <BackLink href={backHref} className="mt-2" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink href={backHref} />

      <Hero restaurant={restaurant} />

      {/* The rest of the page is this restaurant's finances — the profile fields that
          used to sit here (hours, coordinates, description) told a finance user nothing
          they'd act on, and the ones that do are in the header above. */}
      <OrdersPanel restaurant={restaurant} />

      {/* Row timestamps are provenance, not content — a muted footer keeps them
          available without giving them a card of their own next to the real data. */}
      <p className="text-caption text-muted tabular">
        Created {formatDateTime(restaurant.createdAt)} · Updated{' '}
        {formatDateTime(restaurant.updatedAt)}
      </p>
    </div>
  );
}

/** The directory link the user arrived from, carrying their page and filters. Validated
 * as an in-app restaurants path rather than trusted: it's a query parameter, and a
 * `back` pointing anywhere else is either a broken link or someone playing. */
function safeBackHref(raw: string | null): string {
  if (!raw) return '/restaurants';
  const decoded = decodeURIComponent(raw);
  return decoded.startsWith('/restaurants') ? decoded : '/restaurants';
}

function Hero({ restaurant }: { restaurant: RestaurantWithRelations }) {
  const isRated = restaurant.rating !== undefined && !!restaurant.reviews;
  const phones = splitPhones(restaurant.phone);
  const flags = [
    restaurant.isFeatured && 'Featured',
    restaurant.isDiscount && 'Discount',
    restaurant.isPromo && 'Promo',
  ].filter((flag): flag is string => Boolean(flag));

  return (
    <section className="border-border/70 bg-surface rounded-card shadow-card relative overflow-hidden border">
      {/* Brand wash across the top of the card, faded out downward so the header
          content sits on plain surface and stays readable in both themes. */}
      <div
        aria-hidden
        className="brand-gradient absolute inset-x-0 top-0 h-28 opacity-[0.16]"
        style={{ maskImage: 'linear-gradient(to bottom, black, transparent)' }}
      />
      <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
        {restaurant.picture?.url ? (
          // Plain <img>, not next/image — see the note on the list thumbnail.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.picture.url}
            alt=""
            className="ring-border/70 shadow-card size-24 shrink-0 rounded-2xl object-cover ring-1"
          />
        ) : (
          <span className="bg-surface-secondary text-muted ring-border/70 grid size-24 shrink-0 place-items-center rounded-2xl ring-1">
            <StoreIcon className="size-9" />
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Typography.Heading level={1} className="text-h3 font-bold tracking-tight">
              {formatOrNone(restaurant.name)}
            </Typography.Heading>

            {restaurant.location && (
              // The coordinates themselves are noise on a finance screen; what anyone
              // actually does with them is open the map, so only that is offered.
              <a
                href={`https://www.google.com/maps?q=${restaurant.location.latitude},${restaurant.location.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-caption text-accent-soft-foreground hover:bg-accent-soft focus-visible:ring-focus border-border/70 flex shrink-0 items-center gap-1.5 rounded-pill border px-3 py-1.5 font-bold transition-colors outline-none focus-visible:ring-2"
              >
                <MapPinIcon className="size-3.5" />
                Open in Maps
                <ExternalLinkIcon className="size-3.5" />
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusChip enabled={restaurant.enabled} active={restaurant.active} size="lg" />
            {isRated && (
              <span className="text-body flex items-center gap-1.5">
                <StarIcon className="size-4 text-[var(--warning)]" />
                <span className="tabular font-bold">{restaurant.rating!.toFixed(1)}</span>
                <span className="text-muted text-caption tabular">
                  ({formatNumber(restaurant.reviews)} reviews)
                </span>
              </span>
            )}
            {flags.map((flag) => (
              <Chip key={flag} color="accent" variant="soft" size="sm">
                <Chip.Label>{flag}</Chip.Label>
              </Chip>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-body text-muted flex items-start gap-2">
              <MapPinIcon className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">
                {formatOrNone(restaurant.address)}
                {restaurant.city?.name && (
                  <span className="text-muted"> · {restaurant.city.name}</span>
                )}
              </span>
            </span>

            <span className="text-body text-muted flex items-start gap-2">
              <PhoneIcon className="mt-0.5 size-4 shrink-0" />
              {phones.length > 0 ? (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {phones.map((number) => (
                    <a
                      key={number}
                      href={`tel:${number.replace(/\s/g, '')}`}
                      className="tabular text-foreground hover:text-accent-soft-foreground transition-colors"
                    >
                      {number}
                    </a>
                  ))}
                </span>
              ) : (
                <span>—</span>
              )}
            </span>
          </div>

          <code className="text-micro text-muted bg-surface-secondary w-fit rounded-md px-2 py-1">
            {restaurant.objectId}
          </code>
        </div>
      </div>
    </section>
  );
}

function BackLink({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`text-caption text-muted hover:text-foreground hover:border-border-secondary border-border/70 bg-surface focus-visible:ring-focus flex w-fit items-center gap-2 rounded-pill border px-3 py-1.5 font-bold transition-colors outline-none focus-visible:ring-2 ${className ?? ''}`}
    >
      <ArrowLeftIcon className="size-3.5" />
      Back to restaurants
    </Link>
  );
}
