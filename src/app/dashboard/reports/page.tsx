import { PlatformShell } from '@/components/platform/PlatformShell';
import { ReportsHome } from '@/components/platform/ReportsHome';

export default function ReportsPage() {
  return (
    <PlatformShell title="Reports & Dashboards">
      <ReportsHome />
    </PlatformShell>
  );
}