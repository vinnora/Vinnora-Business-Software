import { NextResponse } from 'next/server';
import RestrictionRule from '@/models/RestrictionRule';
import { route, setupContext, readJson, VIEW_SETUP } from '@/lib/platform/api';
import { describeObject } from '@/lib/platform/metadata';
import { cleanRestrictionRule } from '@/lib/platform/rule-input';

type P = { object: string };

export const GET = route<P>(async (_req, { object }) => {
  const { tenant } = await setupContext(...VIEW_SETUP);
  const describe = await describeObject(tenant, object);
  const rules = await RestrictionRule.find({ orgId: tenant, objectApiName: describe.apiName }).sort({ name: 1 });
  return NextResponse.json(rules);
});

export const POST = route<P>(async (req, { object }) => {
  const { tenant } = await setupContext('customizeApplication');
  const describe = await describeObject(tenant, object);
  const data = cleanRestrictionRule(await readJson(req), describe);
  const rule = await RestrictionRule.create({ ...data, orgId: tenant, objectApiName: describe.apiName });
  return NextResponse.json(rule, { status: 201 });
});
