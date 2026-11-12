import { NextResponse } from 'next/server';
import ObjectDefinition from '@/models/ObjectDefinition';
import { route, setupContext, readJson, str, VIEW_SETUP } from '@/lib/platform/api';
import { listObjects } from '@/lib/platform/metadata';
import { getStandardObject } from '@/lib/platform/registry';
import { BadRequestError } from '@/lib/platform/errors';
import { ALL_APP_KEYS, toApiName, type AppKey } from '@/lib/platform/types';

/** GET /api/platform/objects?app=sales-service — built-in + custom objects. */
export const GET = route(async (req) => {
  const { tenant } = await setupContext(...VIEW_SETUP);
  const app = req.nextUrl.searchParams.get('app') as AppKey | null;
  if (app && !ALL_APP_KEYS.includes(app)) throw new BadRequestError('Unknown app');
  return NextResponse.json(await listObjects(tenant, app || undefined));
});

/** POST — create a custom object. */
export const POST = route(async (req) => {
  const { ctx, tenant } = await setupContext('customizeApplication');
  const body = await readJson(req);
  const label = str(body.label, 80);
  const pluralLabel = str(body.pluralLabel, 80) || `${label}s`;
  const app = body.app as AppKey;
  if (!label) throw new BadRequestError('Label is required');
  if (!ALL_APP_KEYS.includes(app)) throw new BadRequestError('Choose the app this object belongs to');

  const apiName = `${toApiName(str(body.apiName, 60).replace(/__c$/, '') || label)}__c`;
  if (getStandardObject(apiName)) throw new BadRequestError(`${apiName} is reserved`);

  const obj = await ObjectDefinition.create({
    orgId: tenant,
    apiName,
    label,
    pluralLabel,
    app,
    description: str(body.description, 1000),
    nameFieldLabel: str(body.nameFieldLabel, 80) || `${label} Name`,
    createdBy: ctx.userId,
  });
  return NextResponse.json(obj, { status: 201 });
});
