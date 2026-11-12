import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Sandbox from '@/models/Sandbox';
import { ENV_COOKIE, getAuthContext } from '@/lib/auth-helpers';
import { readJson, route } from '@/lib/platform/api';
import { canEnter } from '@/lib/platform/sandbox-access';
import { BadRequestError } from '@/lib/platform/errors';

/** GET — current environment and the sandboxes this user can switch into. */
export const GET = route(async () => {
  const ctx = await getAuthContext();
  const list = ctx.orgId ? await Sandbox.find({ orgId: ctx.orgId, status: 'ready' }).sort({ name: 1 }).lean() : [];
  return NextResponse.json({
    current: ctx.sandbox ? { id: ctx.sandbox.id, name: ctx.sandbox.name, type: ctx.sandbox.type } : null,
    sandboxes: list.filter((s) => canEnter(ctx, s)).map((s) => ({ id: String(s._id), name: s.name, type: s.type })),
  });
});

/** POST { sandboxId: string | null } — switch environment (null = production). */
export const POST = route(async (req) => {
  const ctx = await getAuthContext();
  const body = await readJson<{ sandboxId?: string | null }>(req);
  const res = NextResponse.json({ ok: true });
  if (!body.sandboxId) {
    res.cookies.delete(ENV_COOKIE);
    return res;
  }
  if (!mongoose.isValidObjectId(body.sandboxId)) throw new BadRequestError('Test workspace not found');
  const sbx = await Sandbox.findOne({ _id: body.sandboxId, orgId: ctx.orgId, status: 'ready' }).lean();
  if (!sbx || !canEnter(ctx, sbx)) throw new BadRequestError('Test workspace not found or you do not have access to it');
  res.cookies.set(ENV_COOKIE, String(sbx._id), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
});
