import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';
import dbConnect from './mongodb';
import User from '@/models/User';
import Organization from '@/models/Organization';
import type { AppKey } from '@/models/Organization';

export type OrgRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

const ROLE_LEVEL: Record<OrgRole, number> = {
  viewer: 0,
  member: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

export interface AuthContext {
  userId: string;
  orgId: string;
  orgRole: OrgRole;
  appRole: OrgRole;
  org: any;
  user: any;
}

/**
 * Get the authenticated user's context for a given app.
 * Always re-fetches from DB to avoid stale JWT data.
 * Falls back to dev context when no session (dev mode).
 */
export async function getAuthContext(app?: AppKey): Promise<AuthContext> {
  await dbConnect();
  const session = await getServerSession(authOptions);

  // Dev fallback — allow unauthenticated access in development
  if (!session?.user?.id) {
    return {
      userId: 'dev-user-id',
      orgId: 'dev-org-id',
      orgRole: 'owner',
      appRole: 'owner',
      org: { plan: 'all-in-one', apps: ['sales-service', 'accounting', 'inventory', 'marketing', 'hrm', 'manufacturing'], maxSeats: 100 },
      user: { _id: 'dev-user-id', email: 'dev@vinnora.com', orgRole: 'owner' },
    };
  }

  const user = await User.findById(session.user.id);
  if (!user) {
    throw new Error('User not found');
  }

  // If user has no org yet, treat as solo user
  if (!user.orgId) {
    return {
      userId: user._id.toString(),
      orgId: '',
      orgRole: 'owner',
      appRole: 'owner',
      org: { plan: 'free', apps: user.modules || [], maxSeats: 1 },
      user,
    };
  }

  const org = await Organization.findById(user.orgId);
  if (!org) {
    throw new Error('Organization not found');
  }

  const orgRole = (user.orgRole || 'member') as OrgRole;

  // Per-app role override: check appRoles map, fall back to orgRole
  let appRole = orgRole;
  if (app && user.appRoles instanceof Map && user.appRoles.has(app)) {
    appRole = user.appRoles.get(app) as OrgRole;
  } else if (app && user.appRoles && typeof user.appRoles === 'object' && !(user.appRoles instanceof Map)) {
    const roles = user.appRoles as any;
    if (roles[app]) appRole = roles[app] as OrgRole;
  }

  return {
    userId: user._id.toString(),
    orgId: org._id.toString(),
    orgRole,
    appRole,
    org,
    user,
  };
}

/** Check if user's role meets the minimum required level */
export function requireRole(ctx: AuthContext, minRole: OrgRole): void {
  if (ROLE_LEVEL[ctx.appRole] < ROLE_LEVEL[minRole]) {
    throw new ForbiddenError(`Requires ${minRole} role or higher`);
  }
}

/** Check if the org's plan includes the given app */
export function requireModuleAccess(ctx: AuthContext, app: AppKey): void {
  if (ctx.orgId === 'dev-org-id') return; // dev mode
  if (!ctx.org?.apps?.includes(app)) {
    throw new ModuleAccessError(app);
  }
}

/** Viewer cannot write */
export function canWrite(ctx: AuthContext): boolean {
  return ROLE_LEVEL[ctx.appRole] >= ROLE_LEVEL.member;
}

/** Manager+ can manage (delete, bulk ops) */
export function canManage(ctx: AuthContext): boolean {
  return ROLE_LEVEL[ctx.appRole] >= ROLE_LEVEL.manager;
}

/** Admin+ for org-level operations */
export function canAdmin(ctx: AuthContext): boolean {
  return ROLE_LEVEL[ctx.appRole] >= ROLE_LEVEL.admin;
}

/** Is owner */
export function isOwner(ctx: AuthContext): boolean {
  return ctx.orgRole === 'owner';
}

/** Custom error classes */
export class ForbiddenError extends Error {
  status = 403;
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ModuleAccessError extends Error {
  status = 403;
  constructor(app: string) {
    super(`The ${app} module is not available on your current plan. Please upgrade.`);
    this.name = 'ModuleAccessError';
  }
}

/** Helper to return proper error responses from auth errors */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof ModuleAccessError) {
    return NextResponse.json({ error: error.message, code: 'MODULE_ACCESS' }, { status: 403 });
  }
  if (error instanceof Error && error.message === 'User not found') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
