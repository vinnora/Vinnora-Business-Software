import { NextResponse } from 'next/server';
import { route, setupContext, readJson, VIEW_SETUP } from '@/lib/platform/api';
import { describeObject } from '@/lib/platform/metadata';
import { checkFormula } from '@/lib/platform/formula';

/** POST { object, formula } — syntax + reference check. */
export const POST = route(async (req) => {
  const { tenant } = await setupContext(...VIEW_SETUP);
  const body = await readJson<{ object?: string; formula?: string }>(req);
  const describe = await describeObject(tenant, String(body.object || ''));
  return NextResponse.json(checkFormula(String(body.formula || ''), describe.fields.map((f) => f.apiName)));
});
