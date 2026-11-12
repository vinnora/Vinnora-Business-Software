import { AccessSetup, type SetupTab } from '@/components/platform/AccessSetup';
import { PlatformShell } from '@/components/platform/PlatformShell';
import { MODULE_THEMES } from '@/components/platform/themes';
import { ALL_APP_KEYS, APP_LABELS, type AppKey } from '@/lib/platform/types';

const TABS: SetupTab[] = ['users', 'profiles', 'permissionSets', 'groups', 'objects', 'dataLoader', 'sandboxes'];

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ tab?: string; from?: string }> }) {
  const { tab, from } = await searchParams;
  const initialTab = TABS.includes(tab as SetupTab) ? (tab as SetupTab) : 'users';
  // Opened from an app's Settings → Users & Access: offer a way back to it.
  const fromApp = ALL_APP_KEYS.includes(from as AppKey) ? (from as AppKey) : null;
  const back = fromApp ? { href: `/dashboard/${fromApp}/setup?tab=access`, label: `Back to ${APP_LABELS[fromApp]} Settings` } : undefined;
  return (
    <PlatformShell title="Settings" back={back}>
      <p className="text-sm text-gray-600 mb-4">
        Manage who can do what across every app, configure modules, move data in and out, and try changes in test workspaces before deploying
        them to production.
      </p>
      <AccessSetup theme={MODULE_THEMES.setup} initialTab={initialTab} />
    </PlatformShell>
  );
}
