import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Profile from '@/models/Profile';
import { route, setupContext, readJson, str, VIEW_SETUP } from '@/lib/platform/api';
import { ensureSystemProfiles } from '@/lib/platform/access';
import { listMembers } from '@/lib/platform/assignments';
import { BadRequestError, NotFoundError } from '@/lib/platform/errors';

/** GET — all profiles with user counts. */
export const GET = route(async () => {
  const { ctx, tenant } = await setupContext(...VIEW_SETUP);
  await ensureSystemProfiles(tenant);
  const [profiles, members] = await Promise.all([
    Profile.find({ orgId: tenant }).sort({ isSystem: -1, name: 1 }).lean(),
    listMembers(ctx, tenant),
  ]);
  return NextResponse.json(
    profiles.map((p) => ({ ...p, _id: String(p._id), userCount: members.filter((m) => m.profileId === String(p._id)).length })),
  );
});

/** POST { name, description, cloneFrom } — profiles are always created by cloning. */
export const POST = route(async (req) => {
  const { tenant } = await setupContext('manageProfilesPermissionSets');
  const body = await readJson(req);
  const name = str(body.name, 80);
  if (!name) throw new BadRequestError('Role name is required');
  if (!body.cloneFrom || !mongoose.isValidObjectId(body.cloneFrom)) throw new BadRequestError('Choose a role to clone');
  const src = await Profile.findOne({ _id: body.cloneFrom, orgId: tenant }).lean();
  if (!src) throw new NotFoundError('Source role not found');

  const fromAdmin = src.key === 'system_admin';
  const profile = await Profile.create({
    orgId: tenant,
    name,
    description: str(body.description, 500),
    isSystem: false,
    appAccess: src.appAccess,
    objectPermissions: src.objectPermissions || {},
    fieldPermissions: src.fieldPermissions || {},
    systemPermissions: src.systemPermissions || {},
    defaultObjectAccess: src.defaultObjectAccess || {},
  });
  return NextResponse.json({ ...profile.toObject(), clonedFromAdmin: fromAdmin }, { status: 201 });
});
