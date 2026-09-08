import { PageHeader } from '@/components/ui/page-header';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Welcome to the Switch finance dashboard."
      />
      <DashboardOverview />
    </>
  );
}
