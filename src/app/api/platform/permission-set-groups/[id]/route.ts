import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import PermissionSetGroup from '@/models/PermissionSetGroup';
import User from '@/models/User';
import UserAssignment from '@/models/UserAssignment';
import { route, setupContext, readJson, str } from '@/lib/platform/api';
import { validSetIds } from '@/lib/platform/assignments';
import { NotFoundError } from '@/lib/platform/errors';

type P = { id: string };

async function load(tenant: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Group not found');
  const g = await PermissionSetGroup.findOne({ _id: id, orgId: tenant });
  if (!g) throw new NotFoundError('Group not found');
  return g;
}

export const PATCH = route<P>(async (req, { id }) => {
  const { tenant } = await setupContext('manageProfilesPermissionSets');
  const group = await load(tenant, id);
  const body = await readJson(req);
  if (body.name !== undefined) group.name = str(body.name, 80) || group.name;
  if (body.description !== undefined) group.description = str(body.description, 500);
  if (body.permissionSetIds !== undefined) group.permissionSetIds = await validSetIds(tenant, body.permissionSetIds);
  await group.save();
  return NextResponse.json(group);
});

export const DELETE = route<P>(async (_req, { id }) => {
  const { ctx, tenant } = await setupContext('manageProfilesPermissionSets');
  const group = await load(tenant, id);
  if (ctx.sandbox) await UserAssignment.updateMany({ orgId: tenant }, { $pull: { permissionSetGroupIds: id } });
  else if (ctx.orgId) await User.updateMany({ orgId: ctx.orgId }, { $pull: { permissionSetGroupIds: id } });
  await group.deleteOne();
  return NextResponse.json({ success: true });
});
