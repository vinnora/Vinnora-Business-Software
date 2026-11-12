/** Loading sandboxes for the current org. Server-only. */
import mongoose from 'mongoose';
import Sandbox from '@/models/Sandbox';
import type { AuthContext } from '@/lib/auth-helpers';
import { NotFoundError } from './errors';

export async function loadSandbox(ctx: AuthContext, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Test workspace not found');
  const sbx = await Sandbox.findOne({ _id: id, orgId: ctx.orgId });
  if (!sbx) throw new NotFoundError('Test workspace not found');
  return sbx;
}

/** Can this user switch into the sandbox? */
export function canEnter(ctx: AuthContext, sbx: { createdBy: string; userIds?: string[] }) {
  return ctx.orgRole === 'owner' || ctx.orgRole === 'admin' || sbx.createdBy === ctx.userId || (sbx.userIds || []).includes(ctx.userId);
}
