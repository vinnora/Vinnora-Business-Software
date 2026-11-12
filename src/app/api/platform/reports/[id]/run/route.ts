import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Report from '@/models/Report';
import { route, setupContext } from '@/lib/platform/api';
import { canView, runReport, toDefinition } from '@/lib/platform/reports';
import { NotFoundError } from '@/lib/platform/errors';

type P = { id: string };

/** GET — run a saved report as the current user. */
export const GET = route<P>(async (_req, { id }) => {
  const { ctx, tenant } = await setupContext();
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Report not found');
  const doc = await Report.findOne({ _id: id, orgId: tenant }).lean();
  if (!doc || !canView(ctx, doc as { folder: string; ownerId: string })) throw new NotFoundError('Report not found');
  const result = await runReport(ctx, toDefinition(doc as Record<string, unknown>));
  await Report.updateOne({ _id: id }, { $set: { lastRunAt: new Date() } });
  return NextResponse.json(result);
});
