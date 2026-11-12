import { PlatformShell } from '@/components/platform/PlatformShell';
import { ProfileSettings } from '@/components/ProfileSettings';
import { APP_LABELS, type AppKey } from '@/lib/platform/types';

/** Where the avatar was clicked, so "back" returns to that app. Only in-app paths are accepted. */
function backLink(from?: string) {
  if (!from || !from.startsWith('/dashboard/') || from.startsWith('//') || from.startsWith('/dashboard/profile')) return undefined;
  const app = from.split('/')[2] as AppKey;
  return { href: from, label: APP_LABELS[app] ? `Back to ${APP_LABELS[app]}` : 'Back' };
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ from?: string | string[] }> }) {
  const { from } = await searchParams;
  return (
    <PlatformShell title="Profile" back={backLink(Array.isArray(from) ? from[0] : from)}>
      <ProfileSettings />
    </PlatformShell>
  );
}
