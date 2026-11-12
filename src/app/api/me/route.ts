import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, handleAuthError } from '@/lib/auth-helpers';
import { getEffectivePermissions } from '@/lib/platform/access';
import { APP_LABELS, type AppKey } from '@/lib/platform/types';
import User from '@/models/User';

const isDev = (userId: string) => userId === 'dev-user-id';

/** GET — the signed-in user's own profile. */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    let profileName = '';
    let apps: AppKey[] = [];
    try {
      const perms = await getEffectivePermissions(ctx);
      profileName = perms.profileName;
      apps = [...perms.apps];
    } catch {
      /* access details are informational only */
    }
    return NextResponse.json({
      id: ctx.userId,
      name: ctx.user?.name || '',
      email: ctx.user?.email || '',
      orgRole: ctx.orgRole,
      workspace: ctx.org?.name || ctx.user?.company || '',
      profileName,
      apps: apps.map((a) => APP_LABELS[a]).filter(Boolean),
      memberSince: ctx.user?.createdAt ? new Date(ctx.user.createdAt).toISOString() : null,
      editable: !isDev(ctx.userId),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/** PATCH — update the user's own display name. */
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (isDev(ctx.userId)) return NextResponse.json({ error: 'Sign in to edit your profile.' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    await User.updateOne({ _id: ctx.userId }, { $set: { name } });
    return NextResponse.json({ name });
  } catch (error) {
    return handleAuthError(error);
  }
}
