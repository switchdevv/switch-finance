import { Suspense } from 'react';
import { DriverDetail } from '@/components/drivers/driver-detail';

// ?id= rather than a path segment, for the static export — see the restaurant detail page.
export default function DriverDetailPage() {
  return (
    <Suspense
      fallback={<div className="border-border/70 rounded-card h-64 animate-pulse border" />}
    >
      <DriverDetail />
    </Suspense>
  );
}
