import { Suspense } from 'react';
import { InvoiceDocument } from '@/components/invoice/invoice-document';

// ?id= rather than a path segment — see the note on (dashboard)/restaurants/detail.
export default function InvoicePage() {
  return (
    // InvoiceDocument reads the id and the date range from useSearchParams(), which Next
    // requires to sit inside a Suspense boundary — omitting this passes in dev and fails
    // the production build.
    <Suspense fallback={<div className="h-64 animate-pulse" />}>
      <InvoiceDocument />
    </Suspense>
  );
}
