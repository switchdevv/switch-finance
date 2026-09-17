import { Suspense } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { RestaurantsTable } from '@/components/restaurants/restaurants-table';

export default function RestaurantsPage() {
  return (
    <>
      <PageHeader
        eyebrow="restaurants.eyebrow"
        title="restaurants.title"
        description="restaurants.description"
      />
      {/* RestaurantsTable reads useSearchParams() (the current page number), which
          Next requires to sit inside a Suspense boundary — omitting this passes in
          dev but fails `next build` with a "should be wrapped in a suspense
          boundary" error. */}
      <Suspense
        fallback={<div className="border-border/70 rounded-card h-64 animate-pulse border" />}
      >
        <RestaurantsTable />
      </Suspense>
    </>
  );
}
