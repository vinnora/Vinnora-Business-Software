import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Dashboard from '@/models/Dashboard';
import { readJson, route, setupContext } from '@/lib/platform/api';
import { canEdit, canManagePublic, canView } from '@/lib/platform/reports';
import { cleanDashboard } from '@/lib/platform/dashboards';
import { NotFoundError } from '@/lib/platform/errors';
import { ForbiddenError } from '@/lib/auth-helpers';

type P = { id: string };

async function load(tenant: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Dashboard not found');
  const doc = await Dashboard.findOne({ _id: id, orgId: tenant });
  if (!doc) throw new NotFoundError('Dashboard not found');
  return doc;
}

export const GET = route<P>(async (_req, { id }) => {
  const { ctx, tenant } = await setupContext();
  const doc = await load(tenant, id);
  if (!canView(ctx, doc)) throw new NotFoundError('Dashboard not found');
  return NextResponse.json({ ...doc.toObject(), canEdit: await canEdit(ctx, doc) });
});

export const PATCH = route<P>(async (req, { id }) => {
  const { ctx, tenant } = await setupContext();
  const doc = await load(tenant, id);
  if (!canView(ctx, doc) || !(await canEdit(ctx, doc))) throw new ForbiddenError("You can't edit this dashboard.");
  const data = await cleanDashboard(ctx, tenant, await readJson(req));
  if (data.folder === 'public' && doc.folder !== 'public' && !(await canManagePublic(ctx))) {
    throw new ForbiddenError('You need "Manage Public Reports & Dashboards" to publish a dashboard.');
  }
  doc.set(data);
  await doc.save();
  return NextResponse.json({ ...doc.toObject(), canEdit: true });
});

export const DELETE = route<P>(async (_req, { id }) => {
  const { ctx, tenant } = await setupContext();
  const doc = await load(tenant, id);
  if (!canView(ctx, doc) || !(await canEdit(ctx, doc))) throw new ForbiddenError("You can't delete this dashboard.");
  await doc.deleteOne();
  return NextResponse.json({ success: true });
});
