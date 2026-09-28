import { Suspense } from 'react';
import { DriverStatementDocument } from '@/components/invoice/driver-statement-document';

// ?id= rather than a path segment — see the note on (dashboard)/restaurants/detail.
export default function DriverStatementPage() {
  return (
    // Reads the id, the period and the options from useSearchParams(), which Next requires
    // to sit inside a Suspense boundary.
    <Suspense fallback={<div className="h-64 animate-pulse" />}>
      <DriverStatementDocument />
    </Suspense>
  );
}
