import { PlatformShell } from '@/components/platform/PlatformShell';
import { DashboardPage } from '@/components/platform/DashboardPage';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PlatformShell title="Reports & Dashboards">
      <DashboardPage key={id} id={id} />
    </PlatformShell>
  );
}