import { NextResponse } from 'next/server';
import { route, setupContext } from '@/lib/platform/api';

/** GET — the current user's effective access summary (for showing/hiding UI). */
export const GET = route(async () => {
  const { ctx, perms } = await setupContext();
  return NextResponse.json({
    userId: ctx.userId,
    orgRole: ctx.orgRole,
    profileId: perms.profileId,
    profileName: perms.profileName,
    isSuperUser: perms.isSuperUser,
    apps: [...perms.apps],
    system: perms.system,
    permissionSetIds: perms.permissionSetIds,
  });
});
