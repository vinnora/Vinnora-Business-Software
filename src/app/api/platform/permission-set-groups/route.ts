import { NextResponse } from 'next/server';
import PermissionSetGroup from '@/models/PermissionSetGroup';
import { route, setupContext, readJson, str, VIEW_SETUP } from '@/lib/platform/api';
import { listMembers, validSetIds } from '@/lib/platform/assignments';
import { BadRequestError } from '@/lib/platform/errors';
import { toApiName } from '@/lib/platform/types';

export const GET = route(async () => {
  const { ctx, tenant } = await setupContext(...VIEW_SETUP);
  const [groups, members] = await Promise.all([PermissionSetGroup.find({ orgId: tenant }).sort({ name: 1 }).lean(), listMembers(ctx, tenant)]);
  return NextResponse.json(
    groups.map((g) => ({ ...g, _id: String(g._id), userCount: members.filter((m) => m.permissionSetGroupIds.includes(String(g._id))).length })),
  );
});

export const POST = route(async (req) => {
  const { tenant } = await setupContext('manageProfilesPermissionSets');
  const body = await readJson(req);
  const name = str(body.name, 80);
  if (!name) throw new BadRequestError('Name is required');
  const group = await PermissionSetGroup.create({
    orgId: tenant,
    name,
    apiName: toApiName(str(body.apiName, 80) || name),
    description: str(body.description, 500),
    permissionSetIds: await validSetIds(tenant, body.permissionSetIds),
  });
  return NextResponse.json(group, { status: 201 });
});
