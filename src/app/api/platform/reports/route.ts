import { NextResponse } from 'next/server';
import Report from '@/models/Report';
import { readJson, route, setupContext } from '@/lib/platform/api';
import { canManagePublic, cleanReportDefinition, toDefinition, uniqueReportApiName } from '@/lib/platform/reports';
import { ForbiddenError } from '@/lib/auth-helpers';

/** GET — reports the user can see (public + their private ones). */
export const GET = route(async () => {
  const { ctx, tenant } = await setupContext();
  const docs = await Report.find({ orgId: tenant, $or: [{ folder: 'public' }, { ownerId: ctx.userId }] })
    .sort({ updatedAt: -1 })
    .lean();
  const managePublic = await canManagePublic(ctx);
  return NextResponse.json(
    docs.map((d) => {
      const def = toDefinition(d as Record<string, unknown>);
      return { ...def, canEdit: def.folder === 'private' ? def.ownerId === ctx.userId : managePublic };
    }),
  );
});

/** POST — create a report. */
export const POST = route(async (req) => {
  const { ctx, tenant } = await setupContext();
  const def = await cleanReportDefinition(ctx, await readJson(req));
  if (def.folder === 'public' && !(await canManagePublic(ctx))) {
    throw new ForbiddenError('You need "Manage Public Reports & Dashboards" to save to the public folder.');
  }
  const doc = await Report.create({
    ...def,
    orgId: tenant,
    apiName: await uniqueReportApiName(tenant, def.name),
    ownerId: ctx.userId,
    ownerName: ctx.user?.name || ctx.user?.email || '',
  });
  return NextResponse.json({ ...toDefinition(doc.toObject()), canEdit: true }, { status: 201 });
});
