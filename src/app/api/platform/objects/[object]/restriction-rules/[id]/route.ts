import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import RestrictionRule from '@/models/RestrictionRule';
import { route, setupContext, readJson } from '@/lib/platform/api';
import { describeObject } from '@/lib/platform/metadata';
import { cleanRestrictionRule } from '@/lib/platform/rule-input';
import { NotFoundError } from '@/lib/platform/errors';

type P = { object: string; id: string };

export const PATCH = route<P>(async (req, { object, id }) => {
  const { tenant } = await setupContext('customizeApplication');
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Rule not found');
  const describe = await describeObject(tenant, object);
  const existing = await RestrictionRule.findOne({ _id: id, orgId: tenant, objectApiName: describe.apiName });
  if (!existing) throw new NotFoundError('Rule not found');
  const body = await readJson(req);
  if (Object.keys(body).length === 1 && 'active' in body) {
    existing.active = Boolean(body.active);
    await existing.save();
    return NextResponse.json(existing);
  }
  existing.set(cleanRestrictionRule({ ...existing.toObject(), ...body }, describe));
  await existing.save();
  return NextResponse.json(existing);
});

export const DELETE = route<P>(async (_req, { object, id }) => {
  const { tenant } = await setupContext('customizeApplication');
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Rule not found');
  await RestrictionRule.deleteOne({ _id: id, orgId: tenant, objectApiName: object });
  return NextResponse.json({ success: true });
});
