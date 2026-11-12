import { AccessSetup, type SetupTab } from '@/components/platform/AccessSetup';
import { PlatformShell } from '@/components/platform/PlatformShell';
import { MODULE_THEMES } from '@/components/platform/themes';

const TABS: SetupTab[] = ['users', 'profiles', 'permissionSets', 'groups', 'objects', 'dataLoader', 'sandboxes'];

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab = TABS.includes(tab as SetupTab) ? (tab as SetupTab) : 'users';
  return (
    <PlatformShell title="Settings">
      <p className="text-sm text-gray-600 mb-4">
        Manage who can do what across every app, configure modules, move data in and out, and try changes in test workspaces before deploying
        them to production.
      </p>
      <AccessSetup theme={MODULE_THEMES.setup} initialTab={initialTab} />
    </PlatformShell>
  );
}
