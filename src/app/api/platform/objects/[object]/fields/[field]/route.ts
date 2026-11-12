import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import FieldDefinition from '@/models/FieldDefinition';
import PageLayout from '@/models/PageLayout';
import Profile from '@/models/Profile';
import PermissionSet from '@/models/PermissionSet';
import CustomRecord from '@/models/CustomRecord';
import { route, setupContext, readJson } from '@/lib/platform/api';
import { allObjectApiNames, describeObject } from '@/lib/platform/metadata';
import { cleanPicklist, validateCustomField } from '@/lib/platform/field-input';
import { getStandardObject } from '@/lib/platform/registry';
import { BadRequestError, NotFoundError } from '@/lib/platform/errors';

type P = { object: string; field: string };

/**
 * PATCH — update a custom field, or customise a built-in field
 * (label, help text, description, required, default, picklist labels/order/active).
 */
export const PATCH = route<P>(async (req, { object, field }) => {
  const { tenant } = await setupContext('customizeApplication');
  const describe = await describeObject(tenant, object);
  const current = describe.fields.find((f) => f.apiName === field);
  if (!current) throw new NotFoundError('Field not found');
  const body = await readJson(req);

  if (current.isCustom) {
    const input = validateCustomField({ ...current, ...body }, describe, await allObjectApiNames(tenant), current.type);
    const updated = await FieldDefinition.findOneAndUpdate(
      { orgId: tenant, objectApiName: describe.apiName, apiName: field, isOverride: { $ne: true } },
      { $set: { ...input, active: body.active === undefined ? current.active !== false : Boolean(body.active) } },
      { new: true },
    );
    return NextResponse.json(updated);
  }

  if (current.isSystem) throw new BadRequestError('System fields cannot be customised');
  const set: Record<string, unknown> = {
    label: String(body.label ?? current.label).trim().slice(0, 80) || current.label,
    type: current.type,
    isOverride: true,
    helpText: String(body.helpText ?? current.helpText ?? '').slice(0, 500),
    description: String(body.description ?? current.description ?? '').slice(0, 1000),
    required: current.requiredLocked ? true : Boolean(body.required ?? current.required),
  };
  if (body.defaultValue !== undefined) set.defaultValue = body.defaultValue;
  if (current.picklistValues && body.picklistValues !== undefined) {
    const allowed = new Set(current.picklistValues.map((p) => p.value));
    const cleaned = cleanPicklist(body.picklistValues);
    const extra = cleaned.filter((p) => !allowed.has(p.value));
    if (extra.length && current.restrictedPicklist) {
      throw new BadRequestError(
        `Built-in dropdown values can be relabelled, reordered or deactivated, but not added (${extra.map((p) => p.value).join(', ')}).`,
      );
    }
    set.picklistValues = cleaned;
  }
  const updated = await FieldDefinition.findOneAndUpdate(
    { orgId: tenant, objectApiName: describe.apiName, apiName: field },
    { $set: set, $setOnInsert: { orgId: tenant, objectApiName: describe.apiName, apiName: field } },
    { new: true, upsert: true },
  );
  return NextResponse.json(updated);
});

/** DELETE — delete a custom field (and its data), or reset a built-in field's customisations. */
export const DELETE = route<P>(async (_req, { object, field }) => {
  const { tenant } = await setupContext('customizeApplication');
  const describe = await describeObject(tenant, object);
  const current = describe.fields.find((f) => f.apiName === field);
  if (!current) throw new NotFoundError('Field not found');

  if (!current.isCustom) {
    await FieldDefinition.deleteOne({ orgId: tenant, objectApiName: describe.apiName, apiName: field, isOverride: true });
    return NextResponse.json({ success: true, reset: true });
  }

  const refs = describe.fields.filter((f) => f.type === 'formula' && f.formula && new RegExp(`\\b${field}\\b`, 'i').test(f.formula));
  if (refs.length) {
    throw new BadRequestError(`Used by calculated field(s): ${refs.map((f) => f.label).join(', ')}. Update them first.`);
  }

  await FieldDefinition.deleteOne({ orgId: tenant, objectApiName: describe.apiName, apiName: field, isOverride: { $ne: true } });

  // Remove stored values
  if (describe.isCustom) {
    await CustomRecord.updateMany({ orgId: tenant, objectApiName: describe.apiName }, { $unset: { [`custom.${field}`]: 1 } });
  } else {
    const std = getStandardObject(describe.apiName);
    const model = std?.model || mongoose.models[describe.apiName];
    if (model) await model.updateMany({ orgId: tenant }, { $unset: { [`custom.${field}`]: 1 } });
  }

  // Remove from layouts and permission records
  const layouts = await PageLayout.find({ orgId: tenant, objectApiName: describe.apiName });
  for (const l of layouts) {
    for (const s of l.sections) s.items = s.items.filter((i: { field: string }) => i.field !== field);
    l.markModified('sections');
    await l.save();
  }
  const unset = { $unset: { [`fieldPermissions.${describe.apiName}.${field}`]: 1 } };
  await Profile.updateMany({ orgId: tenant }, unset);
  await PermissionSet.updateMany({ orgId: tenant }, unset);

  return NextResponse.json({ success: true });
});
