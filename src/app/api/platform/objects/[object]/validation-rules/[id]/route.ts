import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import ValidationRule from '@/models/ValidationRule';
import { route, setupContext, readJson } from '@/lib/platform/api';
import { describeObject } from '@/lib/platform/metadata';
import { cleanValidationRule } from '@/lib/platform/rule-input';
import { NotFoundError } from '@/lib/platform/errors';

type P = { object: string; id: string };

export const PATCH = route<P>(async (req, { object, id }) => {
  const { tenant } = await setupContext('customizeApplication');
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Rule not found');
  const describe = await describeObject(tenant, object);
  const existing = await ValidationRule.findOne({ _id: id, orgId: tenant, objectApiName: describe.apiName });
  if (!existing) throw new NotFoundError('Rule not found');
  const body = await readJson(req);
  // Toggle-only update
  if (Object.keys(body).length === 1 && 'active' in body) {
    existing.active = Boolean(body.active);
    await existing.save();
    return NextResponse.json(existing);
  }
  const data = cleanValidationRule({ ...existing.toObject(), ...body }, describe);
  existing.set(data);
  await existing.save();
  return NextResponse.json(existing);
});

export const DELETE = route<P>(async (_req, { object, id }) => {
  const { tenant } = await setupContext('customizeApplication');
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Rule not found');
  await ValidationRule.deleteOne({ _id: id, orgId: tenant, objectApiName: object });
  return NextResponse.json({ success: true });
});
