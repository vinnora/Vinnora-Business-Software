import { NextResponse } from 'next/server';
import Dashboard from '@/models/Dashboard';
import { readJson, route, setupContext } from '@/lib/platform/api';
import { canManagePublic, uniqueReportApiName } from '@/lib/platform/reports';
import { cleanDashboard } from '@/lib/platform/dashboards';
import { ForbiddenError } from '@/lib/auth-helpers';
import type mongoose from 'mongoose';

export const GET = route(async () => {
  const { ctx, tenant } = await setupContext();
  const docs = await Dashboard.find({ orgId: tenant, $or: [{ folder: 'public' }, { ownerId: ctx.userId }] }).sort({ updatedAt: -1 }).lean();
  const managePublic = await canManagePublic(ctx);
  return NextResponse.json(
    docs.map((d) => ({ ...d, _id: String(d._id), canEdit: d.folder === 'private' ? d.ownerId === ctx.userId : managePublic })),
  );
});

export const POST = route(async (req) => {
  const { ctx, tenant } = await setupContext();
  const data = await cleanDashboard(ctx, tenant, await readJson(req));
  if (data.folder === 'public' && !(await canManagePublic(ctx))) {
    throw new ForbiddenError('You need "Manage Public Reports & Dashboards" to save to the public folder.');
  }
  const doc = await Dashboard.create({
    ...data,
    orgId: tenant,
    apiName: await uniqueReportApiName(tenant, data.name, Dashboard as unknown as mongoose.Model<unknown>),
    ownerId: ctx.userId,
    ownerName: ctx.user?.name || ctx.user?.email || '',
  });
  return NextResponse.json({ ...doc.toObject(), canEdit: true }, { status: 201 });
});
