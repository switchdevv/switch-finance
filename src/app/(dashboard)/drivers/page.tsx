import { Suspense } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DriversTable } from '@/components/drivers/drivers-table';
import { WalletSettingsButton } from '@/components/drivers/wallet-settings';

export default function DriversPage() {
  return (
    <>
      <PageHeader
        eyebrow="drivers.eyebrow"
        title="drivers.title"
        description="drivers.description"
        actions={<WalletSettingsButton />}
      />
      {/* DriversTable reads useSearchParams() (page and filters), which Next requires to
          sit inside a Suspense boundary. */}
      <Suspense
        fallback={<div className="border-border/70 rounded-card h-64 animate-pulse border" />}
      >
        <DriversTable />
      </Suspense>
    </>
  );
}
