import { Suspense } from 'react';
import { RestaurantDetail } from '@/components/restaurants/restaurant-detail';

export default async function RestaurantDetailPage({
  params,
}: PageProps<'/restaurants/[objectId]'>) {
  const { objectId } = await params;

  // No PageHeader here: the detail view opens with a hero carrying the restaurant's
  // own name and status, and a generic "Restaurant" title above it would just push
  // that hero down without saying anything.
  return (
    <Suspense
      fallback={<div className="border-border/70 rounded-card h-64 animate-pulse border" />}
    >
      <RestaurantDetail objectId={objectId} />
    </Suspense>
  );
}
