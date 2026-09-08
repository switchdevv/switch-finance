import { Suspense } from 'react';
import { RestaurantDetail } from '@/components/restaurants/restaurant-detail';

// The restaurant is identified by ?id= rather than a path segment: the app is exported
// to static files (see next.config.ts), and a dynamic segment would need its ids at
// build time — they live in Parse and are only reachable from the browser.
export default function RestaurantDetailPage() {
  // No PageHeader here: the detail view opens with a hero carrying the restaurant's
  // own name and status, and a generic "Restaurant" title above it would just push
  // that hero down without saying anything.
  return (
    // RestaurantDetail reads the id and the back link from useSearchParams(), which
    // Next requires to sit inside a Suspense boundary.
    <Suspense
      fallback={<div className="border-border/70 rounded-card h-64 animate-pulse border" />}
    >
      <RestaurantDetail />
    </Suspense>
  );
}
