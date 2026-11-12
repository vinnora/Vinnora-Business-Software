import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Dashboard from '@/models/Dashboard';
import Report from '@/models/Report';
import { route, setupContext } from '@/lib/platform/api';
import { canView, runReport, toDefinition } from '@/lib/platform/reports';
import { NotFoundError } from '@/lib/platform/errors';
import type { ReportDefinition, ReportResult } from '@/lib/platform/report-types';

type P = { id: string };

/** GET — run every component's report as the viewing user (their permissions apply). */
export const GET = route<P>(async (_req, { id }) => {
  const { ctx, tenant } = await setupContext();
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Dashboard not found');
  const dash = await Dashboard.findOne({ _id: id, orgId: tenant }).lean();
  if (!dash || !canView(ctx, dash as { folder: string; ownerId: string })) throw new NotFoundError('Dashboard not found');

  const comps = ((dash as { components?: { reportId: string }[] }).components || []);
  const ids: string[] = [...new Set(comps.map((c) => String(c.reportId)))];
  const reports = await Report.find({ _id: { $in: ids }, orgId: tenant }).lean();
  const out: Record<string, { report?: ReportDefinition; result?: ReportResult; error?: string }> = {};
  await Promise.all(
    ids.map(async (rid) => {
      const doc = reports.find((r) => String(r._id) === rid);
      if (!doc || !canView(ctx, doc as { folder: string; ownerId: string })) {
        out[rid] = { error: 'Report not found or not shared with you' };
        return;
      }
      const def = toDefinition(doc as Record<string, unknown>);
      try {
        out[rid] = { report: def, result: await runReport(ctx, def) };
      } catch (e) {
        out[rid] = { report: def, error: (e as Error).message };
      }
    }),
  );
  return NextResponse.json(out);
});
