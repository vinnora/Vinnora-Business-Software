import { NextResponse } from 'next/server';
import { readJson, route, setupContext } from '@/lib/platform/api';
import { cleanReportDefinition, runReport } from '@/lib/platform/reports';

/** POST — run an unsaved report definition (builder preview). */
export const POST = route(async (req) => {
  const { ctx } = await setupContext();
  const body = await readJson(req);
  const def = await cleanReportDefinition(ctx, { name: 'Preview', ...body });
  return NextResponse.json(await runReport(ctx, def));
});
