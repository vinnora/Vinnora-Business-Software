import { NextResponse } from 'next/server';
import { productionContext, route } from '@/lib/platform/api';
import { rollbackDeployment } from '@/lib/platform/sandboxes';

type P = { id: string };

/** POST — restore production to its state before this deployment. */
export const POST = route<P>(async (_req, { id }) => {
  const { ctx, prodTenant } = await productionContext('manageSandboxes');
  const dep = await rollbackDeployment(ctx, id, prodTenant);
  const { snapshot: _snapshot, ...rest } = dep.toObject();
  void _snapshot;
  return NextResponse.json(rest);
});
