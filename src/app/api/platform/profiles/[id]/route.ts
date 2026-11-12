import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Profile from '@/models/Profile';
import User from '@/models/User';
import UserAssignment from '@/models/UserAssignment';
import LayoutAssignment from '@/models/LayoutAssignment';
import RestrictionRule from '@/models/RestrictionRule';
import { route, setupContext, readJson, str, VIEW_SETUP } from '@/lib/platform/api';
import { allObjectApiNames } from '@/lib/platform/metadata';
import { cleanBundle, cleanDefaultAccess } from '@/lib/platform/permission-input';
import { BadRequestError, NotFoundError } from '@/lib/platform/errors';

type P = { id: string };

async function load(tenant: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Role not found');
  const p = await Profile.findOne({ _id: id, orgId: tenant });
  if (!p) throw new NotFoundError('Role not found');
  return p;
}

export const GET = route<P>(async (_req, { id }) => {
  const { tenant } = await setupContext(...VIEW_SETUP);
  return NextResponse.json(await load(tenant, id));
});

export const PATCH = route<P>(async (req, { id }) => {
  const { tenant } = await setupContext('manageProfilesPermissionSets');
  const profile = await load(tenant, id);
  if (profile.key === 'system_admin') {
    throw new BadRequestError('The System Administrator role always has full access and cannot be edited.');
  }
  const body = await readJson(req);
  const bundle = cleanBundle(body, new Set(await allObjectApiNames(tenant)));

  if (!profile.isSystem && body.name !== undefined) profile.name = str(body.name, 80) || profile.name;
  if (body.description !== undefined) profile.description = str(body.description, 500);
  if (bundle.appAccess) profile.appAccess = bundle.appAccess;
  if (bundle.objectPermissions) {
    profile.objectPermissions = bundle.objectPermissions;
    profile.markModified('objectPermissions');
  }
  if (bundle.fieldPermissions) {
    profile.fieldPermissions = bundle.fieldPermissions;
    profile.markModified('fieldPermissions');
  }
  if (bundle.systemPermissions) {
    profile.systemPermissions = bundle.systemPermissions;
    profile.markModified('systemPermissions');
  }
  const def = cleanDefaultAccess(body.defaultObjectAccess);
  if (def) {
    profile.defaultObjectAccess = def as unknown as Record<string, boolean>;
    profile.markModified('defaultObjectAccess');
  }
  await profile.save();
  return NextResponse.json(profile);
});

export const DELETE = route<P>(async (_req, { id }) => {
  const { ctx, tenant } = await setupContext('manageProfilesPermissionSets');
  const profile = await load(tenant, id);
  if (profile.isSystem) throw new BadRequestError('Built-in roles cannot be deleted.');
  const users = ctx.sandbox
    ? await UserAssignment.countDocuments({ orgId: tenant, profileId: id })
    : await User.countDocuments({ profileId: id });
  if (users) throw new BadRequestError(`${users} user(s) still have this role. Reassign them first.`);
  await LayoutAssignment.deleteMany({ orgId: tenant, profileId: id });
  await RestrictionRule.updateMany({ orgId: tenant, appliesTo: 'profiles' }, { $pull: { appliesToIds: id } });
  await profile.deleteOne();
  return NextResponse.json({ success: true });
});
