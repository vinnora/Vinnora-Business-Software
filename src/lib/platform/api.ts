/** Route-handler helpers for platform APIs. Server-only. */
import type { NextRequest } from 'next/server';
import { getAuthContext, type AuthContext } from '@/lib/auth-helpers';
import { getEffectivePermissions, requireSystemPermission, type EffectivePermissions } from './access';
import { BadRequestError, platformErrorResponse } from './errors';
import type { SystemPermissionKey } from './types';

type Handler<P> = (req: NextRequest, params: P) => Promise<Response>;

/** Wrap a handler: awaits params and converts thrown errors into JSON responses. */
export function route<P = Record<string, never>>(fn: Handler<P>) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      const params = context?.params ? await context.params : ({} as P);
      return await fn(req, params);
    } catch (e) {
      return platformErrorResponse(e, `[${req.method} ${req.nextUrl.pathname}]`);
    }
  };
}

export interface SetupContext {
  ctx: AuthContext;
  perms: EffectivePermissions;
  tenant: string;
}

/** Auth + require at least one of the given system permissions. */
export async function setupContext(...anyOf: SystemPermissionKey[]): Promise<SetupContext> {
  const ctx = await getAuthContext();
  const perms = anyOf.length ? await requireSystemPermission(ctx, ...anyOf) : await getEffectivePermissions(ctx);
  return { ctx, perms, tenant: perms.tenant };
}

/**
 * Like setupContext, but always evaluates permissions in production — used for
 * environment management (sandboxes, deployments), which acts on production.
 */
export async function productionContext(...anyOf: SystemPermissionKey[]): Promise<SetupContext & { prodTenant: string }> {
  const full = await getAuthContext();
  const ctx: AuthContext = { ...full, sandbox: undefined };
  const perms = anyOf.length ? await requireSystemPermission(ctx, ...anyOf) : await getEffectivePermissions(ctx);
  if (!full.orgId) throw new BadRequestError('Sandboxes need a workspace (organisation).');
  return { ctx: full, perms, tenant: perms.tenant, prodTenant: perms.tenant };
}

export const VIEW_SETUP: SystemPermissionKey[] = ['viewSetup', 'customizeApplication', 'manageProfilesPermissionSets', 'manageUsers'];

export async function readJson<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new BadRequestError('Request body must be valid JSON');
  }
}

export function str(v: unknown, max = 255): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
