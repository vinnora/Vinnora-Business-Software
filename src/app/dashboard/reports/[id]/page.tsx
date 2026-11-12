import { PlatformShell } from '@/components/platform/PlatformShell';
import { ReportPage } from '@/components/platform/ReportPage';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PlatformShell title="Reports">
      <ReportPage key={id} id={id} />
    </PlatformShell>
  );
}