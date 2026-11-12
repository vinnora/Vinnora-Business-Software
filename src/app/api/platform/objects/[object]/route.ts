import { NextResponse } from 'next/server';
import ObjectDefinition from '@/models/ObjectDefinition';
import FieldDefinition from '@/models/FieldDefinition';
import ValidationRule from '@/models/ValidationRule';
import RestrictionRule from '@/models/RestrictionRule';
import PageLayout from '@/models/PageLayout';
import LayoutAssignment from '@/models/LayoutAssignment';
import CustomRecord from '@/models/CustomRecord';
import { route, setupContext, readJson, str, VIEW_SETUP } from '@/lib/platform/api';
import { describeObject } from '@/lib/platform/metadata';
import { BadRequestError, NotFoundError } from '@/lib/platform/errors';

type P = { object: string };

/** GET — full object metadata (all fields, no FLS) for Setup. */
export const GET = route<P>(async (_req, { object }) => {
  const { tenant } = await setupContext(...VIEW_SETUP);
  const describe = await describeObject(tenant, object);
  const counts = {
    validationRules: await ValidationRule.countDocuments({ orgId: tenant, objectApiName: describe.apiName }),
    restrictionRules: await RestrictionRule.countDocuments({ orgId: tenant, objectApiName: describe.apiName }),
    layouts: await PageLayout.countDocuments({ orgId: tenant, objectApiName: describe.apiName }),
    records: describe.isCustom ? await CustomRecord.countDocuments({ orgId: tenant, objectApiName: describe.apiName }) : undefined,
  };
  return NextResponse.json({ ...describe, counts });
});

/** PATCH — edit a custom object's labels/description. */
export const PATCH = route<P>(async (req, { object }) => {
  const { tenant } = await setupContext('customizeApplication');
  const body = await readJson(req);
  const obj = await ObjectDefinition.findOne({ orgId: tenant, apiName: object });
  if (!obj) throw new BadRequestError('Only custom modules can be edited');
  if (body.label !== undefined) obj.label = str(body.label, 80) || obj.label;
  if (body.pluralLabel !== undefined) obj.pluralLabel = str(body.pluralLabel, 80) || obj.pluralLabel;
  if (body.description !== undefined) obj.description = str(body.description, 1000);
  if (body.nameFieldLabel !== undefined) obj.nameFieldLabel = str(body.nameFieldLabel, 80) || obj.nameFieldLabel;
  await obj.save();
  return NextResponse.json(obj);
});

/** DELETE — delete a custom object with all its metadata and records. */
export const DELETE = route<P>(async (_req, { object }) => {
  const { tenant } = await setupContext('customizeApplication');
  const obj = await ObjectDefinition.findOne({ orgId: tenant, apiName: object });
  if (!obj) throw new NotFoundError('Custom module not found (built-in modules cannot be deleted)');
  const scope = { orgId: tenant, objectApiName: obj.apiName };
  await Promise.all([
    FieldDefinition.deleteMany(scope),
    ValidationRule.deleteMany(scope),
    RestrictionRule.deleteMany(scope),
    PageLayout.deleteMany(scope),
    LayoutAssignment.deleteMany(scope),
    CustomRecord.deleteMany(scope),
  ]);
  await obj.deleteOne();
  return NextResponse.json({ success: true });
});
