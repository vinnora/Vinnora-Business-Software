/** Who has which profile / permission set. Server-only. */
import mongoose from 'mongoose';
import User from '@/models/User';
import Profile from '@/models/Profile';
import PermissionSet from '@/models/PermissionSet';
import PermissionSetGroup from '@/models/PermissionSetGroup';
import UserAssignment from '@/models/UserAssignment';
import { defaultProfileKeyForRole } from './access';
import type { AuthContext } from '@/lib/auth-helpers';

export interface MemberRow {
  _id: string;
  name: string;
  email: string;
  orgRole: string;
  isActive: boolean;
  profileId: string;
  profileAssigned: boolean;
  permissionSetIds: string[];
  permissionSetGroupIds: string[];
}

/** Keep only ids of permission sets that exist in the tenant. */
export async function validSetIds(tenant: string, ids: unknown): Promise<string[]> {
  const list = (Array.isArray(ids) ? ids : []).map(String).filter((id) => mongoose.isValidObjectId(id));
  if (!list.length) return [];
  const found = await PermissionSet.find({ _id: { $in: list }, orgId: tenant }).select('_id').lean();
  return found.map((s) => String(s._id));
}

/** Keep only ids of permission set groups that exist in the tenant. */
export async function validGroupIds(tenant: string, ids: unknown): Promise<string[]> {
  const list = (Array.isArray(ids) ? ids : []).map(String).filter((id) => mongoose.isValidObjectId(id));
  if (!list.length) return [];
  const found = await PermissionSetGroup.find({ _id: { $in: list }, orgId: tenant }).select('_id').lean();
  return found.map((g) => String(g._id));
}

/** Users of the tenant with their effective profile id. */
export async function listMembers(ctx: AuthContext, tenant: string): Promise<MemberRow[]> {
  const users = ctx.orgId
    ? await User.find({ orgId: ctx.orgId }).select('-password').sort({ name: 1 }).lean()
    : await User.find({ _id: ctx.userId }).select('-password').lean().catch(() => []);
  const sysProfiles = await Profile.find({ orgId: tenant, isSystem: true }).select('key').lean();
  const byKey = new Map(sysProfiles.map((p) => [p.key as string, String(p._id)]));
  // In a sandbox, assignments live in UserAssignment rather than on the User.
  const sandboxAssignments = ctx.sandbox
    ? new Map((await UserAssignment.find({ orgId: tenant }).lean()).map((a) => [a.userId as string, a as Record<string, unknown>]))
    : null;
  return users.map((u) => {
    const role = (u.orgRole as string) || 'member';
    const derived = byKey.get(role === 'owner' ? 'system_admin' : defaultProfileKeyForRole(role)) || '';
    const a = sandboxAssignments ? sandboxAssignments.get(String(u._id)) || {} : (u as Record<string, unknown>);
    return {
      _id: String(u._id),
      name: u.name as string,
      email: u.email as string,
      orgRole: role,
      isActive: u.isActive !== false,
      profileId: (a.profileId as string) || derived,
      profileAssigned: Boolean(a.profileId),
      permissionSetIds: (a.permissionSetIds as string[]) || [],
      permissionSetGroupIds: (a.permissionSetGroupIds as string[]) || [],
    };
  });
}

/** Save a user's profile / permission set assignments in the current environment. */
export async function saveAssignment(
  ctx: AuthContext,
  tenant: string,
  userId: string,
  patch: { profileId?: string | null; permissionSetIds?: string[]; permissionSetGroupIds?: string[] },
) {
  if (ctx.sandbox) {
    await UserAssignment.updateOne({ orgId: tenant, userId }, { $set: patch }, { upsert: true });
  } else {
    await User.updateOne({ _id: userId }, { $set: patch });
  }
}
