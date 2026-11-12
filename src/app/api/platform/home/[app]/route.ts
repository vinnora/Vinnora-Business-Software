import { NextResponse } from 'next/server';
import { readJson, route, setupContext } from '@/lib/platform/api';
import { canManagePublic } from '@/lib/platform/reports';
import { cleanHomeComponents, findHome, isAppKey, runHomeComponents, saveHome } from '@/lib/platform/dashboards';
import { NotFoundError } from '@/lib/platform/errors';
import { ForbiddenError } from '@/lib/auth-helpers';
import type { DashboardComponentDTO, HomeDashboardDTO } from '@/lib/platform/report-types';

type P = { app: string };

/** GET — the app's Home dashboard components, run as the viewing user. */
export const GET = route<P>(async (_req, { app }) => {
  if (!isAppKey(app)) throw new NotFoundError('Unknown app');
  const { ctx, tenant } = await setupContext();
  const [home, canEdit] = await Promise.all([findHome(tenant, app), canManagePublic(ctx)]);
  const components = ((home?.components as DashboardComponentDTO[] | undefined) || []).map((c) => ({ ...c }));
  const body: HomeDashboardDTO = {
    components,
    canEdit,
    data: components.length ? await runHomeComponents(ctx, tenant, components) : {},
    updatedAt: home?.updatedAt ? new Date(home.updatedAt as Date).toISOString() : undefined,
  };
  return NextResponse.json(body);
});

/** PUT — replace the app's Home components. Shared with everyone, so it needs "Manage Public Reports". */
export const PUT = route<P>(async (req, { app }) => {
  if (!isAppKey(app)) throw new NotFoundError('Unknown app');
  const { ctx, tenant } = await setupContext();
  if (!(await canManagePublic(ctx))) {
    throw new ForbiddenError('You need "Manage Public Reports & Home Dashboards" to change what an app\'s Home shows.');
  }
  const body = await readJson<{ components?: unknown }>(req);
  const components = await cleanHomeComponents(tenant, body.components);
  await saveHome(tenant, app, components, { userId: ctx.userId, userName: ctx.user?.name || ctx.user?.email || '' });
  const out: HomeDashboardDTO = { components, canEdit: true, data: components.length ? await runHomeComponents(ctx, tenant, components) : {} };
  return NextResponse.json(out);
});
