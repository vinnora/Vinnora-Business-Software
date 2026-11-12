import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '@/models/User';
import Profile from '@/models/Profile';
import { route, setupContext, readJson, VIEW_SETUP } from '@/lib/platform/api';
import { listMembers, saveAssignment, validGroupIds, validSetIds } from '@/lib/platform/assignments';
import { BadRequestError, NotFoundError } from '@/lib/platform/errors';

/** GET — org users with profile / permission set assignments (for the current environment). */
export const GET = route(async () => {
  const { ctx, tenant } = await setupContext(...VIEW_SETUP);
  return NextResponse.json(await listMembers(ctx, tenant));
});

/** PATCH { userId, profileId?, permissionSetIds?, permissionSetGroupIds? } */
export const PATCH = route(async (req) => {
  const { ctx, tenant } = await setupContext('manageUsers');
  const body = await readJson(req);
  const userId = String(body.userId || '');
  if (!mongoose.isValidObjectId(userId)) throw new BadRequestError('userId required');
  const user = await User.findById(userId).lean();
  const sameOrg = ctx.orgId ? user?.orgId === ctx.orgId : String(user?._id) === ctx.userId;
  if (!user || !sameOrg) throw new NotFoundError('User not found');

  const patch: { profileId?: string | null; permissionSetIds?: string[]; permissionSetGroupIds?: string[] } = {};
  if (body.profileId !== undefined) {
    if (user.orgRole === 'owner') throw new BadRequestError('The workspace owner always has full access; their profile cannot be changed.');
    if (body.profileId === null || body.profileId === '') {
      patch.profileId = null;
    } else {
      const profileId = String(body.profileId);
      if (!mongoose.isValidObjectId(profileId) || !(await Profile.exists({ _id: profileId, orgId: tenant }))) {
        throw new BadRequestError('Profile not found');
      }
      patch.profileId = profileId;
    }
  }
  if (body.permissionSetIds !== undefined) patch.permissionSetIds = await validSetIds(tenant, body.permissionSetIds);
  if (body.permissionSetGroupIds !== undefined) patch.permissionSetGroupIds = await validGroupIds(tenant, body.permissionSetGroupIds);
  await saveAssignment(ctx, tenant, userId, patch);
  const rows = await listMembers(ctx, tenant);
  return NextResponse.json(rows.find((r) => r._id === userId));
});
