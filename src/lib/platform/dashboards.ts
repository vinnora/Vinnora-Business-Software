/** App Home dashboards: one shared set of report components per app. Server-only. */
import mongoose from 'mongoose';
import Dashboard from '@/models/Dashboard';
import Report from '@/models/Report';
import type { AuthContext } from '@/lib/auth-helpers';
import { BadRequestError } from './errors';
import { canView, runReport, toDefinition } from './reports';
import type { DashboardComponentDTO, HomeDataMap } from './report-types';
import { ALL_APP_KEYS, APP_LABELS, type AppKey } from './types';

export function isAppKey(v: string): v is AppKey {
  return (ALL_APP_KEYS as string[]).includes(v);
}

/** Stable api name so sandboxes can compare and deploy each app's Home dashboard. */
export const homeApiName = (app: AppKey) => `home_${app.replace(/-/g, '_')}`;

export async function findHome(tenant: string, app: AppKey) {
  return Dashboard.findOne({ orgId: tenant, appKey: app }).lean();
}

/**
 * Validate Home components. Everyone in the workspace sees an app's Home,
 * so only reports from the public folder can be shown on it.
 */
export async function cleanHomeComponents(tenant: string, raw: unknown): Promise<DashboardComponentDTO[]> {
  const list = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  const reportIds = list.map((c) => String(c?.reportId || '')).filter((id) => mongoose.isValidObjectId(id));
  const reports = await Report.find({ _id: { $in: reportIds }, orgId: tenant }).select('_id folder').lean();
  const byId = new Map(reports.map((r) => [String(r._id), r]));
  const components: DashboardComponentDTO[] = [];
  for (const c of list.slice(0, 30)) {
    const r = byId.get(String(c?.reportId));
    if (!r) continue;
    if (r.folder !== 'public') throw new BadRequestError('Home pages can only show reports from the public folder.');
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
  return components;
}

export async function saveHome(tenant: string, app: AppKey, components: DashboardComponentDTO[], actor: { userId: string; userName?: string }) {
  let apiName = homeApiName(app);
  // A dashboard from the retired standalone feature may already use this api name.
  const taken = await Dashboard.findOne({ orgId: tenant, apiName, appKey: { $ne: app } }).select('_id').lean();
  if (taken) apiName = `${apiName}_${Date.now().toString(36)}`;
  return Dashboard.findOneAndUpdate(
    { orgId: tenant, appKey: app },
    {
      $set: { components, folder: 'public' },
      $setOnInsert: {
        name: `${APP_LABELS[app]} Home`,
        apiName,
        ownerId: actor.userId,
        ownerName: actor.userName || '',
      },
    },
    { upsert: true, new: true },
  ).lean();
}

/** Run every component's report as the viewing user (their permissions apply). */
export async function runHomeComponents(ctx: AuthContext, tenant: string, components: { reportId: string }[]): Promise<HomeDataMap> {
  const ids = [...new Set(components.map((c) => String(c.reportId)))];
  const reports = await Report.find({ _id: { $in: ids }, orgId: tenant }).lean();
  const out: HomeDataMap = {};
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
  return out;
}
