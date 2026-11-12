import { NextResponse } from 'next/server';
import { productionContext, readJson, route } from '@/lib/platform/api';
import { loadSandbox } from '@/lib/platform/sandbox-access';
import { refreshSandbox } from '@/lib/platform/sandboxes';
import { BadRequestError } from '@/lib/platform/errors';

type P = { id: string };

/** POST { type?, sampleSize? } — wipe the sandbox and copy production again. */
export const POST = route<P>(async (req, { id }) => {
  const { ctx, prodTenant } = await productionContext('manageSandboxes');
  const sbx = await loadSandbox(ctx, id);
  if (sbx.status === 'creating') throw new BadRequestError('This sandbox is already being copied.');
  const body = await readJson(req).catch(() => ({}) as Record<string, unknown>);
  if (['developer', 'partial', 'full'].includes(String(body.type))) sbx.type = body.type as typeof sbx.type;
  if (body.sampleSize) sbx.sampleSize = Math.min(Math.max(Number(body.sampleSize) || 100, 1), 10000);
  await refreshSandbox(ctx, sbx, prodTenant);
  return NextResponse.json(sbx);
});
