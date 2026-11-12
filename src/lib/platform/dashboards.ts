/** Dashboard validation. Server-only. */
import mongoose from 'mongoose';
import Report from '@/models/Report';
import type { AuthContext } from '@/lib/auth-helpers';
import { BadRequestError } from './errors';
import type { DashboardComponentDTO } from './report-types';

export async function cleanDashboard(ctx: AuthContext, tenant: string, body: Record<string, unknown>) {
  const name = String(body.name || '').trim().slice(0, 80);
  if (!name) throw new BadRequestError('Dashboard name is required');
  const folder = body.folder === 'public' ? 'public' : 'private';
  const raw = Array.isArray(body.components) ? (body.components as Record<string, unknown>[]) : [];
  const reportIds = raw.map((c) => String(c?.reportId || '')).filter((id) => mongoose.isValidObjectId(id));
  const reports = await Report.find({ _id: { $in: reportIds }, orgId: tenant }).select('_id folder ownerId').lean();
  const allowed = new Map(reports.map((r) => [String(r._id), r]));
  const components: DashboardComponentDTO[] = [];
  for (const c of raw.slice(0, 30)) {
    const r = allowed.get(String(c.reportId));
    if (!r) continue;
    if (r.folder === 'private' && r.ownerId !== ctx.userId) continue;
    if (folder === 'public' && r.folder === 'private') {
      throw new BadRequestError('Public dashboards can only show reports from the public folder.');
    }
    const kind = (['metric', 'chart', 'table'].includes(String(c.kind)) ? c.kind : 'chart') as DashboardComponentDTO['kind'];
    components.push({
      id: String(c.id || new mongoose.Types.ObjectId()).slice(0, 40),
      reportId: String(r._id),
      title: String(c.title || '').slice(0, 80),
      kind,
      chartType: typeof c.chartType === 'string' ? (c.chartType as DashboardComponentDTO['chartType']) : undefined,
      size: Math.min(Math.max(Number(c.size) || 1, 1), 3),
      aggregateIndex: Number.isFinite(Number(c.aggregateIndex)) ? Number(c.aggregateIndex) : -1,
    });
  }
  return { name, description: String(body.description || '').slice(0, 500), folder, components };
}
