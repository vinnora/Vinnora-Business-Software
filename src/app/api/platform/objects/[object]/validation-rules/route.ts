import { NextResponse } from 'next/server';
import ValidationRule from '@/models/ValidationRule';
import { route, setupContext, readJson, VIEW_SETUP } from '@/lib/platform/api';
import { describeObject } from '@/lib/platform/metadata';
import { cleanValidationRule } from '@/lib/platform/rule-input';

type P = { object: string };

export const GET = route<P>(async (_req, { object }) => {
  const { tenant } = await setupContext(...VIEW_SETUP);
  const describe = await describeObject(tenant, object);
  const rules = await ValidationRule.find({ orgId: tenant, objectApiName: describe.apiName }).sort({ name: 1 });
  return NextResponse.json(rules);
});

export const POST = route<P>(async (req, { object }) => {
  const { tenant } = await setupContext('customizeApplication');
  const describe = await describeObject(tenant, object);
  const data = cleanValidationRule(await readJson(req), describe);
  const rule = await ValidationRule.create({ ...data, orgId: tenant, objectApiName: describe.apiName });
  return NextResponse.json(rule, { status: 201 });
});
