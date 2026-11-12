import { NextResponse } from 'next/server';
import { productionContext, readJson, route } from '@/lib/platform/api';
import { loadSandbox } from '@/lib/platform/sandbox-access';
import { compareSandbox, deploySelection } from '@/lib/platform/sandboxes';
import { isValidComponentType, validateSelection, type ComponentType } from '@/lib/platform/metadata-io';
import { BadRequestError } from '@/lib/platform/errors';

type P = { id: string };

function parseSelection(body: Record<string, unknown>) {
  const raw = Array.isArray(body.selected) ? (body.selected as Record<string, unknown>[]) : [];
  const selected = raw
    .filter((s) => isValidComponentType(s?.type) && typeof s?.key === 'string')
    .map((s) => ({ type: s.type as ComponentType, key: String(s.key) }));
  if (!selected.length) throw new BadRequestError('Select at least one change to deploy');
  return selected;
}

/** POST { selected: [{type,key}], validateOnly?: boolean } */
export const POST = route<P>(async (req, { id }) => {
  const { ctx, prodTenant } = await productionContext('manageSandboxes');
  const sbx = await loadSandbox(ctx, id);
  if (sbx.status !== 'ready') throw new BadRequestError('Test workspace is not ready');
  const body = await readJson(req);
  const selected = parseSelection(body);

  if (body.validateOnly) {
    const { source, target } = await compareSandbox(sbx, prodTenant);
    return NextResponse.json(validateSelection(source, target, selected));
  }
  const { deployment, warnings } = await deploySelection(ctx, sbx, prodTenant, selected);
  return NextResponse.json({ deployment, warnings }, { status: deployment.status === 'succeeded' ? 200 : 500 });
});
