import { Suspense } from 'react';
import { RequireAdmin } from '@/components/require-admin';
import { WalletSettings } from '@/components/drivers/wallet-settings';

/**
 * The wallet rules, global and per region — a page rather than a dialog, because a region
 * list is as long as the country is wide and has to be searched, filtered and paged.
 */
export default function WalletSettingsPage() {
  return (
    <Suspense
      fallback={<div className="border-border/70 rounded-card h-64 animate-pulse border" />}
    >
      <RequireAdmin>
        <WalletSettings />
      </RequireAdmin>
    </Suspense>
  );
}
