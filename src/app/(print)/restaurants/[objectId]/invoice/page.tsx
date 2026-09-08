import { Suspense } from 'react';
import { InvoiceDocument } from '@/components/invoice/invoice-document';

export default async function InvoicePage({
  params,
}: PageProps<'/restaurants/[objectId]/invoice'>) {
  const { objectId } = await params;

  return (
    // InvoiceDocument reads the date range from useSearchParams(), which Next requires
    // to sit inside a Suspense boundary — omitting this passes in dev and fails the
    // production build.
    <Suspense fallback={<div className="h-64 animate-pulse" />}>
      <InvoiceDocument objectId={objectId} />
    </Suspense>
  );
}
