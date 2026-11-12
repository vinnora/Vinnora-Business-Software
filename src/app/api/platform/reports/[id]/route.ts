import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Report from '@/models/Report';
import Dashboard from '@/models/Dashboard';
import { readJson, route, setupContext } from '@/lib/platform/api';
import { canEdit, canManagePublic, canView, cleanReportDefinition, toDefinition } from '@/lib/platform/reports';
import { NotFoundError } from '@/lib/platform/errors';
import { ForbiddenError } from '@/lib/auth-helpers';

type P = { id: string };

async function load(tenant: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Report not found');
  const doc = await Report.findOne({ _id: id, orgId: tenant });
  if (!doc) throw new NotFoundError('Report not found');
  return doc;
}

export const GET = route<P>(async (_req, { id }) => {
  const { ctx, tenant } = await setupContext();
  const doc = await load(tenant, id);
  if (!canView(ctx, doc)) throw new NotFoundError('Report not found');
  return NextResponse.json({ ...toDefinition(doc.toObject()), canEdit: await canEdit(ctx, doc) });
});

export const PATCH = route<P>(async (req, { id }) => {
  const { ctx, tenant } = await setupContext();
  const doc = await load(tenant, id);
  if (!canView(ctx, doc) || !(await canEdit(ctx, doc))) throw new ForbiddenError("You can't edit this report.");
  const def = await cleanReportDefinition(ctx, await readJson(req));
  if (def.folder === 'public' && doc.folder !== 'public' && !(await canManagePublic(ctx))) {
    throw new ForbiddenError('You need "Manage Public Reports & Home Dashboards" to move a report to the public folder.');
  }
  doc.set(def);
  await doc.save();
  return NextResponse.json({ ...toDefinition(doc.toObject()), canEdit: true });
});

export const DELETE = route<P>(async (_req, { id }) => {
  const { ctx, tenant } = await setupContext();
  const doc = await load(tenant, id);
  if (!canView(ctx, doc) || !(await canEdit(ctx, doc))) throw new ForbiddenError("You can't delete this report.");
  await Dashboard.updateMany({ orgId: tenant }, { $pull: { components: { reportId: id } } });
  await doc.deleteOne();
  return NextResponse.json({ success: true });
});
