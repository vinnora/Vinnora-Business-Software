import { NextResponse } from 'next/server';
import PermissionSet from '@/models/PermissionSet';
import { route, setupContext, readJson, str, VIEW_SETUP } from '@/lib/platform/api';
import { listMembers } from '@/lib/platform/assignments';
import { BadRequestError } from '@/lib/platform/errors';
import { toApiName } from '@/lib/platform/types';

export const GET = route(async () => {
  const { ctx, tenant } = await setupContext(...VIEW_SETUP);
  const [sets, members] = await Promise.all([PermissionSet.find({ orgId: tenant }).sort({ name: 1 }).lean(), listMembers(ctx, tenant)]);
  return NextResponse.json(
    sets.map((s) => ({ ...s, _id: String(s._id), userCount: members.filter((m) => m.permissionSetIds.includes(String(s._id))).length })),
  );
});

export const POST = route(async (req) => {
  const { tenant } = await setupContext('manageProfilesPermissionSets');
  const body = await readJson(req);
  const name = str(body.name, 80);
  if (!name) throw new BadRequestError('Name is required');
  const set = await PermissionSet.create({
    orgId: tenant,
    name,
    apiName: toApiName(str(body.apiName, 80) || name),
    description: str(body.description, 500),
    appAccess: [],
    objectPermissions: {},
    fieldPermissions: {},
    systemPermissions: {},
  });
  return NextResponse.json(set, { status: 201 });
});
