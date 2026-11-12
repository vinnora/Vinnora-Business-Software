import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '@/models/User';
import type { AppKey } from '@/models/Organization';
import {
  getAuthContext,
  handleAuthError,
  canWrite,
  canManage,
  canAdmin,
  ForbiddenError,
  type AuthContext,
} from './auth-helpers';

/**
 * Workspace scoping for the module APIs (Marketing, Accounting, Inventory, Manufacturing, HRM and the
 * parts of Sell & Support not yet on the platform).
 *
 * Records belong to the workspace (`orgId`), not to the user who created them. Records created before
 * workspace scoping have no `orgId`; they stay visible to the workspace when their `userId` belongs to
 * one of its members, until scripts/migrate-platform.mjs stamps them.
 */

type Filter = Record<string, unknown>;

export class NotFoundError extends Error {
  status = 404;
  constructor(message = 'Record not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

export interface Tenant {
  ctx: AuthContext;
  /** Workspace key stored in `orgId`: the workspace id, or `user:<id>` for a user without a workspace. */
  orgId: string;
  /** Signed-in user's email — the legacy owner key most module records use as `userId`. */
  email: string;
  /** Signed-in user's id. */
  id: string;
  /** The workspace filter, combined with extra conditions. */
  where(extra?: Filter): Filter;
  /** Ownership fields for a new record. `ownerKey` picks which value goes into `userId` (default: email). */
  stamp(ownerKey?: 'email' | 'id'): { orgId: string; userId: string };
  /** Throw 403 unless the user may create/edit records in this app. */
  requireWrite(): void;
  /** Throw 403 unless the user may delete / bulk-manage records in this app. */
  requireManage(): void;
  /** Throw 403 unless the user is a workspace admin for this app. */
  requireAdmin(): void;
}

/** Fields a client must never set directly. */
const PROTECTED_FIELDS = ['_id', 'orgId', 'userId', 'createdAt', 'updatedAt', '__v'];

/** Remove ownership/system fields from a request body before create/update. */
export function sanitize<T extends Record<string, unknown>>(body: T): Omit<T, '_id' | 'orgId' | 'userId'> {
  const out: Record<string, unknown> = { ...(body || {}) };
  for (const f of PROTECTED_FIELDS) delete out[f];
  return out as Omit<T, '_id' | 'orgId' | 'userId'>;
}

/** Validate a record id from the client; throws 400 when malformed. */
export function recordId(id: unknown): string {
  const s = typeof id === 'string' ? id : String(id ?? '');
  if (!s || !mongoose.isValidObjectId(s)) throw new BadRequestError('A valid record id is required');
  return s;
}

/**
 * Resolve the signed-in user's workspace scope for a module API.
 * `app` selects the user's per-app role. All six apps stay open to every workspace (no plan gating).
 */
export async function getTenant(app?: AppKey): Promise<Tenant> {
  const ctx = await getAuthContext(app);

  const email = String(ctx.user?.email || '');
  const id = String(ctx.userId || '');
  const orgId = ctx.orgId || `user:${id}`;

  // Legacy owner keys: every member's email and id (or just this user's, without a workspace).
  let ownerKeys: string[] = [email, id];
  if (ctx.orgId && ctx.orgId !== 'dev-org-id') {
    const members = await User.find({ orgId: ctx.orgId }).select('email').lean<{ _id: unknown; email?: string }[]>();
    ownerKeys = members.flatMap((m) => [String(m._id), m.email || '']);
  } else if (ctx.orgId === 'dev-org-id') {
    ownerKeys = [id];
  }
  ownerKeys = [...new Set(ownerKeys.filter(Boolean))];

  const base: Filter = {
    $or: [{ orgId }, { orgId: { $in: [null, ''] }, userId: { $in: ownerKeys } }],
  };

  return {
    ctx,
    orgId,
    email,
    id,
    where(extra?: Filter) {
      return extra && Object.keys(extra).length ? { $and: [base, extra] } : base;
    },
    stamp(ownerKey = 'email') {
      return { orgId, userId: ownerKey === 'id' ? id : email || id };
    },
    requireWrite() {
      if (!canWrite(ctx)) throw new ForbiddenError('Your role can view this app but not change records');
    },
    requireManage() {
      if (!canManage(ctx)) throw new ForbiddenError('Requires manager role or higher');
    },
    requireAdmin() {
      if (!canAdmin(ctx)) throw new ForbiddenError('Requires admin role or higher');
    },
  };
}

/**
 * Turn an error into a JSON response with the right status.
 * 400 bad input / invalid id, 401 signed out, 403 no access, 404 not in this workspace,
 * 409 duplicate, 500 anything else (logged).
 */
export function apiError(error: unknown, label = 'API error'): NextResponse {
  if (error instanceof BadRequestError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof NotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof mongoose.Error.CastError) {
    return NextResponse.json({ error: `Invalid value for ${error.path}` }, { status: 400 });
  }
  if (error instanceof mongoose.Error.ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error && typeof error === 'object' && (error as { code?: number }).code === 11000) {
    return NextResponse.json({ error: 'A record with that value already exists.' }, { status: 409 });
  }
  const res = handleAuthError(error);
  if (res.status === 500) console.error(label, error);
  return res;
}
