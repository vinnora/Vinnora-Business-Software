import { NextResponse } from 'next/server';
import ObjectDefinition from '@/models/ObjectDefinition';
import { route, setupContext } from '@/lib/platform/api';
import { BadRequestError } from '@/lib/platform/errors';
import { ALL_APP_KEYS, type AppKey } from '@/lib/platform/types';

/** GET ?app= — custom object tabs the current user can open in an app. */
export const GET = route(async (req) => {
  const { perms, tenant } = await setupContext();
  const app = req.nextUrl.searchParams.get('app') as AppKey | null;
  if (!app || !ALL_APP_KEYS.includes(app)) throw new BadRequestError('app required');
  if (!perms.apps.has(app)) return NextResponse.json([]);
  const objs = await ObjectDefinition.find({ orgId: tenant, app }).sort({ label: 1 }).lean();
  return NextResponse.json(
    objs
      .filter((o) => perms.objectPerm(o.apiName).read)
      .map((o) => ({ apiName: o.apiName, label: o.label, pluralLabel: o.pluralLabel })),
  );
});
