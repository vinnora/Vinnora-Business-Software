import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '@/models/User';
import { productionContext, readJson, route, str } from '@/lib/platform/api';
import { loadSandbox } from '@/lib/platform/sandbox-access';
import { deleteSandbox } from '@/lib/platform/sandboxes';
import { BadRequestError } from '@/lib/platform/errors';

type P = { id: string };

export const GET = route<P>(async (_req, { id }) => {
  const { ctx } = await productionContext('manageSandboxes');
  return NextResponse.json(await loadSandbox(ctx, id));
});

/** PATCH { name?, description?, userIds? } */
export const PATCH = route<P>(async (req, { id }) => {
  const { ctx } = await productionContext('manageSandboxes');
  const sbx = await loadSandbox(ctx, id);
  const body = await readJson(req);
  if (body.name !== undefined) sbx.name = str(body.name, 40) || sbx.name;
  if (body.description !== undefined) sbx.description = str(body.description, 500);
  if (Array.isArray(body.userIds)) {
    const ids = (body.userIds as unknown[]).map(String).filter((u) => mongoose.isValidObjectId(u));
    const members = await User.find({ _id: { $in: ids }, orgId: ctx.orgId }).select('_id').lean();
    sbx.userIds = members.map((m) => String(m._id));
  }
  await sbx.save();
  return NextResponse.json(sbx);
});

export const DELETE = route<P>(async (_req, { id }) => {
  const { ctx } = await productionContext('manageSandboxes');
  const sbx = await loadSandbox(ctx, id);
  if (ctx.sandbox?.id === String(sbx._id)) throw new BadRequestError('Switch to Production before deleting this sandbox.');
  await deleteSandbox(sbx);
  return NextResponse.json({ success: true });
});
