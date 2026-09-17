import { Suspense } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { RequireAdmin } from '@/components/require-admin';
import { AccessTable } from '@/components/access/access-table';

export default function AccessPage() {
  return (
    <>
      <PageHeader
        eyebrow="access.eyebrow"
        title="access.title"
        description="access.description"
      />
      {/* AccessTable reads useSearchParams() (page and filters), which Next requires to
          sit inside a Suspense boundary — omitting this passes in dev but fails
          `next build` with a "should be wrapped in a suspense boundary" error. */}
      <Suspense
        fallback={<div className="border-border/70 rounded-card h-64 animate-pulse border" />}
      >
        <RequireAdmin>
          <AccessTable />
        </RequireAdmin>
      </Suspense>
    </>
  );
}
