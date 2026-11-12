import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import PermissionSet from '@/models/PermissionSet';
import PermissionSetGroup from '@/models/PermissionSetGroup';
import User from '@/models/User';
import UserAssignment from '@/models/UserAssignment';
import RestrictionRule from '@/models/RestrictionRule';
import { route, setupContext, readJson, str, VIEW_SETUP } from '@/lib/platform/api';
import { allObjectApiNames } from '@/lib/platform/metadata';
import { cleanBundle } from '@/lib/platform/permission-input';
import { NotFoundError } from '@/lib/platform/errors';

type P = { id: string };

async function load(tenant: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Permission set not found');
  const s = await PermissionSet.findOne({ _id: id, orgId: tenant });
  if (!s) throw new NotFoundError('Permission set not found');
  return s;
}

export const GET = route<P>(async (_req, { id }) => {
  const { tenant } = await setupContext(...VIEW_SETUP);
  return NextResponse.json(await load(tenant, id));
});

export const PATCH = route<P>(async (req, { id }) => {
  const { tenant } = await setupContext('manageProfilesPermissionSets');
  const set = await load(tenant, id);
  const body = await readJson(req);
  const bundle = cleanBundle(body, new Set(await allObjectApiNames(tenant)));
  if (body.name !== undefined) set.name = str(body.name, 80) || set.name;
  if (body.description !== undefined) set.description = str(body.description, 500);
  if (bundle.appAccess) set.appAccess = bundle.appAccess;
  if (bundle.objectPermissions) {
    set.objectPermissions = bundle.objectPermissions;
    set.markModified('objectPermissions');
  }
  if (bundle.fieldPermissions) {
    set.fieldPermissions = bundle.fieldPermissions;
    set.markModified('fieldPermissions');
  }
  if (bundle.systemPermissions) {
    set.systemPermissions = bundle.systemPermissions;
    set.markModified('systemPermissions');
  }
  await set.save();
  return NextResponse.json(set);
});

export const DELETE = route<P>(async (_req, { id }) => {
  const { ctx, tenant } = await setupContext('manageProfilesPermissionSets');
  const set = await load(tenant, id);
  if (ctx.sandbox) await UserAssignment.updateMany({ orgId: tenant }, { $pull: { permissionSetIds: id } });
  else if (ctx.orgId) await User.updateMany({ orgId: ctx.orgId }, { $pull: { permissionSetIds: id } });
  await PermissionSetGroup.updateMany({ orgId: tenant }, { $pull: { permissionSetIds: id } });
  await RestrictionRule.updateMany({ orgId: tenant, appliesTo: 'permissionSets' }, { $pull: { appliesToIds: id } });
  await set.deleteOne();
  return NextResponse.json({ success: true });
});
