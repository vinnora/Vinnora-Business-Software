import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth-helpers';
import { route } from '@/lib/platform/api';
import { getEffectivePermissions } from '@/lib/platform/access';
import { listObjects } from '@/lib/platform/metadata';

/**
 * GET — connected objects (enforced standard + custom) the user can read, with what they
 * may do to each, plus whether they can import / export at all.
 */
export const GET = route(async () => {
  const ctx = await getAuthContext();
  const perms = await getEffectivePermissions(ctx);
  const objects = (await listObjects(perms.tenant))
    .filter((o) => o.enforced && perms.apps.has(o.app))
    .map((o) => ({ o, p: perms.objectPerm(o.apiName) }))
    .filter(({ p }) => p.read)
    .map(({ o, p }) => ({
      apiName: o.apiName,
      label: o.label,
      pluralLabel: o.pluralLabel,
      app: o.app,
      isCustom: o.isCustom,
      canCreate: p.create,
      canEdit: p.edit,
      canDelete: p.delete,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return NextResponse.json({
    objects,
    canImport: perms.system.importData,
    canExport: perms.system.exportData,
  });
});
