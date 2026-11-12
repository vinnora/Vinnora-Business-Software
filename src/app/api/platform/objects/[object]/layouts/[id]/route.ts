import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import PageLayout from '@/models/PageLayout';
import LayoutAssignment from '@/models/LayoutAssignment';
import { route, setupContext, readJson, str } from '@/lib/platform/api';
import { describeObject } from '@/lib/platform/metadata';
import { sanitizeLayout } from '@/lib/platform/layouts';
import { BadRequestError, NotFoundError } from '@/lib/platform/errors';
import type { LayoutSection } from '@/lib/platform/types';

type P = { object: string; id: string };

export const PATCH = route<P>(async (req, { object, id }) => {
  const { tenant } = await setupContext('customizeApplication');
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Layout not found');
  const describe = await describeObject(tenant, object);
  const layout = await PageLayout.findOne({ _id: id, orgId: tenant, objectApiName: describe.apiName });
  if (!layout) throw new NotFoundError('Layout not found');
  const body = await readJson(req);

  if (body.name !== undefined) layout.name = str(body.name, 80) || layout.name;
  if (body.description !== undefined) layout.description = str(body.description, 500);
  if (Array.isArray(body.sections)) {
    const sections = sanitizeLayout(describe, body.sections as LayoutSection[]);
    // Data-required fields must stay on the layout so users can fill them in.
    const placed = new Set(sections.flatMap((s) => s.items.map((i) => i.field)));
    const missing = describe.fields.filter((f) => f.required && !f.isSystem && !placed.has(f.apiName));
    if (missing.length) {
      throw new BadRequestError(`Required fields must be on the layout: ${missing.map((f) => f.label).join(', ')}`);
    }
    layout.sections = sections;
    layout.markModified('sections');
  }
  if (body.isDefault === true && !layout.isDefault) {
    await PageLayout.updateMany({ orgId: tenant, objectApiName: describe.apiName }, { $set: { isDefault: false } });
    layout.isDefault = true;
  }
  await layout.save();
  return NextResponse.json(layout);
});

export const DELETE = route<P>(async (_req, { object, id }) => {
  const { tenant } = await setupContext('customizeApplication');
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Layout not found');
  const layout = await PageLayout.findOne({ _id: id, orgId: tenant, objectApiName: object });
  if (!layout) throw new NotFoundError('Layout not found');
  const assigned = await LayoutAssignment.countDocuments({ orgId: tenant, layoutId: id });
  if (assigned) throw new BadRequestError('This layout is assigned to profiles. Reassign them first.');
  await layout.deleteOne();
  if (layout.isDefault) {
    const next = await PageLayout.findOne({ orgId: tenant, objectApiName: object }).sort({ createdAt: 1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }
  return NextResponse.json({ success: true });
});
