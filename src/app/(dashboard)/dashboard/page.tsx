import { PageHeader } from '@/components/ui/page-header';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="dashboard.eyebrow"
        title="dashboard.title"
        description="dashboard.description"
      />
      <DashboardOverview />
    </>
  );
}
