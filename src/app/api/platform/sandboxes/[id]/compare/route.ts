import { NextResponse } from 'next/server';
import { productionContext, route } from '@/lib/platform/api';
import { loadSandbox } from '@/lib/platform/sandbox-access';
import { compareSandbox } from '@/lib/platform/sandboxes';
import { diffComponents } from '@/lib/platform/metadata-io';
import { BadRequestError } from '@/lib/platform/errors';

type P = { id: string };

/** GET — every configuration difference between the sandbox and production. */
export const GET = route<P>(async (_req, { id }) => {
  const { ctx, prodTenant } = await productionContext('manageSandboxes');
  const sbx = await loadSandbox(ctx, id);
  if (sbx.status !== 'ready') throw new BadRequestError('Test workspace is not ready');
  const { source, target } = await compareSandbox(sbx, prodTenant);
  return NextResponse.json(diffComponents(source, target));
});
