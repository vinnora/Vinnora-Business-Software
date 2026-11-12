/** Per-user describe (fields the user can see + their layout). Server-only. */
import type { AuthContext } from '@/lib/auth-helpers';
import { getObjectAccess, type ObjectAccess } from './access';
import { resolveLayout } from './layouts';
import type { DescribeResponse } from './types';

export async function describeForUser(ctx: AuthContext, objectApiName: string): Promise<DescribeResponse> {
  const access = await getObjectAccess(ctx, objectApiName);
  access.assert('read');
  return describeFromAccess(access);
}

export async function describeFromAccess(access: ObjectAccess): Promise<DescribeResponse> {
  const userAccess = access.userAccess();
  const layout = await resolveLayout(access.tenant, access.object, access.perms.profileId);
  const visible = new Set(
    access.object.fields.filter((f) => f.active !== false && userAccess.fields[f.apiName]?.read).map((f) => f.apiName),
  );
  return {
    object: { ...access.object, fields: access.object.fields.filter((f) => visible.has(f.apiName)) },
    access: userAccess,
    layout: {
      ...layout,
      sections: layout.sections
        .map((s) => ({
          ...s,
          items: s.items
            .filter((i) => visible.has(i.field))
            .map((i) => (userAccess.fields[i.field]?.edit ? i : { ...i, behavior: 'readonly' as const })),
        }))
        .filter((s) => s.items.length > 0),
    },
  };
}

/** Display name of a record from the object's name fields. */
export function recordName(access: ObjectAccess, rec: Record<string, unknown>): string {
  const parts = access.object.nameFields.map((f) => rec[f]).filter((v) => v !== undefined && v !== null && v !== '');
  return parts.length ? parts.map(String).join(' ') : String(rec._id ?? '');
}
