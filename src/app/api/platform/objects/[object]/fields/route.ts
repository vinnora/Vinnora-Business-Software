import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import FieldDefinition from '@/models/FieldDefinition';
import PageLayout from '@/models/PageLayout';
import Profile from '@/models/Profile';
import { route, setupContext, readJson, VIEW_SETUP } from '@/lib/platform/api';
import { allObjectApiNames, describeObject } from '@/lib/platform/metadata';
import { validateCustomField } from '@/lib/platform/field-input';
import { BadRequestError } from '@/lib/platform/errors';
import { toApiName } from '@/lib/platform/types';

type P = { object: string };

/** GET — fields of an object (built-in + custom, overrides applied). */
export const GET = route<P>(async (_req, { object }) => {
  const { tenant } = await setupContext(...VIEW_SETUP);
  const describe = await describeObject(tenant, object);
  return NextResponse.json(describe.fields);
});

/**
 * POST — create a custom field.
 * Extra options: addToLayouts: string[] (layout ids), fieldAccess: { [profileId]: { read, edit } }
 */
export const POST = route<P>(async (req, { object }) => {
  const { tenant } = await setupContext('customizeApplication');
  const describe = await describeObject(tenant, object);
  if (!describe.supportsCustomFields) throw new BadRequestError(`${describe.label} doesn't support custom fields yet`);

  const body = await readJson(req);
  const input = validateCustomField(body, describe, await allObjectApiNames(tenant));
  const apiName = `${toApiName(String(body.apiName || '').replace(/__c$/, '') || input.label)}__c`;
  if (describe.fields.some((f) => f.apiName.toLowerCase() === apiName.toLowerCase())) {
    throw new BadRequestError(`A field with API name ${apiName} already exists`);
  }
  const order = await FieldDefinition.countDocuments({ orgId: tenant, objectApiName: describe.apiName });
  const def = await FieldDefinition.create({
    ...input,
    orgId: tenant,
    objectApiName: describe.apiName,
    apiName,
    isOverride: false,
    active: true,
    order,
  });

  // Add to selected page layouts (first non-system section, or a new section)
  const layoutIds = Array.isArray(body.addToLayouts) ? (body.addToLayouts as string[]).filter((id) => mongoose.isValidObjectId(id)) : [];
  if (layoutIds.length) {
    const layouts = await PageLayout.find({ _id: { $in: layoutIds }, orgId: tenant, objectApiName: describe.apiName });
    for (const layout of layouts) {
      const behavior = input.type === 'formula' ? 'readonly' : input.required ? 'required' : 'edit';
      const target = layout.sections.find((s: { id: string }) => s.id !== 'system') || null;
      if (target) target.items.push({ field: apiName, behavior });
      else layout.sections.unshift({ id: 'custom', label: 'Additional Information', columns: 2, items: [{ field: apiName, behavior }] });
      layout.markModified('sections');
      await layout.save();
    }
  }

  // Field-level security per profile
  const access = (body.fieldAccess || {}) as Record<string, { read?: boolean; edit?: boolean }>;
  for (const [profileId, fp] of Object.entries(access)) {
    if (!mongoose.isValidObjectId(profileId)) continue;
    const read = Boolean(fp.read || fp.edit);
    const edit = Boolean(fp.edit) && input.type !== 'formula';
    await Profile.updateOne(
      { _id: profileId, orgId: tenant, key: { $ne: 'system_admin' } },
      { $set: { [`fieldPermissions.${describe.apiName}.${apiName}`]: { read, edit } } },
    );
  }

  return NextResponse.json(def, { status: 201 });
});
