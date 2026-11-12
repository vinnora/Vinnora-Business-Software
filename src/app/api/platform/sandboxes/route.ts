import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Sandbox from '@/models/Sandbox';
import { productionContext, readJson, route, str } from '@/lib/platform/api';
import { populateSandbox } from '@/lib/platform/sandboxes';
import { BadRequestError } from '@/lib/platform/errors';

/** GET — sandboxes of the organisation. */
export const GET = route(async () => {
  const { ctx } = await productionContext('manageSandboxes');
  const list = await Sandbox.find({ orgId: ctx.orgId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json(list.map((s) => ({ ...s, _id: String(s._id) })));
});

/** POST { name, description, type: developer|partial|full, sampleSize } — create and copy from production. */
export const POST = route(async (req) => {
  const { ctx, prodTenant } = await productionContext('manageSandboxes');
  const body = await readJson(req);
  const name = str(body.name, 40);
  if (!name) throw new BadRequestError('Sandbox name is required');
  const type = ['developer', 'partial', 'full'].includes(String(body.type)) ? String(body.type) : 'developer';
  const count = await Sandbox.countDocuments({ orgId: ctx.orgId });
  if (count >= 10) throw new BadRequestError('You can have up to 10 sandboxes. Delete one first.');

  const _id = new mongoose.Types.ObjectId();
  const sbx = await Sandbox.create({
    _id,
    orgId: ctx.orgId,
    name,
    description: str(body.description, 500),
    type,
    tenant: `sbx:${_id}`,
    status: 'creating',
    sampleSize: Math.min(Math.max(Number(body.sampleSize) || 100, 1), 10000),
    userIds: [],
    createdBy: ctx.userId,
    createdByName: ctx.user?.name || ctx.user?.email || '',
  });
  await populateSandbox(ctx, sbx, prodTenant);
  return NextResponse.json(sbx, { status: 201 });
});
