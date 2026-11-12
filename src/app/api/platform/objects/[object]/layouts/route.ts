import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import PageLayout from '@/models/PageLayout';
import { route, setupContext, readJson, str, VIEW_SETUP } from '@/lib/platform/api';
import { describeObject } from '@/lib/platform/metadata';
import { generateDefaultLayout, listLayouts, sanitizeLayout } from '@/lib/platform/layouts';
import { BadRequestError } from '@/lib/platform/errors';
import type { LayoutSection } from '@/lib/platform/types';

type P = { object: string };

/** GET — saved layouts; if none exist, the generated default (unsaved) is returned. */
export const GET = route<P>(async (_req, { object }) => {
  const { tenant } = await setupContext(...VIEW_SETUP);
  const describe = await describeObject(tenant, object);
  const layouts = await listLayouts(tenant, describe);
  return NextResponse.json({
    layouts: layouts.map((l) => ({ ...l, sections: sanitizeLayout(describe, l.sections) })),
    generated: layouts.length ? null : generateDefaultLayout(describe),
  });
});

/** POST — create a layout (optionally cloning an existing one). */
export const POST = route<P>(async (req, { object }) => {
  const { tenant } = await setupContext('customizeApplication');
  const describe = await describeObject(tenant, object);
  const body = await readJson(req);
  const name = str(body.name, 80);
  if (!name) throw new BadRequestError('Form layout name is required');

  let sections: LayoutSection[] | undefined = Array.isArray(body.sections) ? (body.sections as LayoutSection[]) : undefined;
  if (!sections && body.cloneFrom && mongoose.isValidObjectId(body.cloneFrom)) {
    const src = await PageLayout.findOne({ _id: body.cloneFrom, orgId: tenant, objectApiName: describe.apiName }).lean();
    if (src) sections = src.sections as LayoutSection[];
  }
  if (!sections) sections = generateDefaultLayout(describe).sections;

  const existingCount = await PageLayout.countDocuments({ orgId: tenant, objectApiName: describe.apiName });
  const layout = await PageLayout.create({
    orgId: tenant,
    objectApiName: describe.apiName,
    name,
    description: str(body.description, 500),
    isDefault: existingCount === 0 || Boolean(body.isDefault),
    sections: sanitizeLayout(describe, sections),
  });
  if (layout.isDefault && existingCount > 0) {
    await PageLayout.updateMany(
      { orgId: tenant, objectApiName: describe.apiName, _id: { $ne: layout._id } },
      { $set: { isDefault: false } },
    );
  }
  return NextResponse.json(layout, { status: 201 });
});
