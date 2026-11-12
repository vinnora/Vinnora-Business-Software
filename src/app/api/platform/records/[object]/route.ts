import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAuthContext } from '@/lib/auth-helpers';
import CustomRecord from '@/models/CustomRecord';
import { route, readJson } from '@/lib/platform/api';
import { buildCreateDoc, getObjectAccess } from '@/lib/platform/access';
import { recordName } from '@/lib/platform/describe';
import { getStandardObject } from '@/lib/platform/registry';
import { BadRequestError } from '@/lib/platform/errors';

type P = { object: string };

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET ?search=&limit=&mode=lookup
 * Lists records the user can see (permissions + restriction rules applied).
 * mode=lookup returns [{ _id, name }] for lookup pickers (works for any object).
 */
export const GET = route<P>(async (req, { object }) => {
  const ctx = await getAuthContext();
  const access = await getObjectAccess(ctx, object);
  access.assert('read');
  const sp = req.nextUrl.searchParams;
  const search = (sp.get('search') || '').trim();
  const limit = Math.min(Math.max(Number(sp.get('limit')) || 200, 1), 500);
  const filter = await access.readFilter();

  const and: Record<string, unknown>[] = [filter];
  if (search) {
    const re = { $regex: escapeRegex(search), $options: 'i' };
    const nameFields = access.object.nameFields.filter((f) => f !== '_id');
    const ors = nameFields.map((f) => ({ [access.field(f)?.path || f]: re }));
    if (mongoose.isValidObjectId(search)) ors.push({ _id: search } as never);
    if (ors.length) and.push({ $or: ors });
  }
  const query = and.length === 1 ? and[0] : { $and: and };

  const model = access.object.isCustom ? CustomRecord : getStandardObject(access.object.apiName)?.model;
  if (!model) throw new BadRequestError('Unknown module');
  const docs = await model.find(query).sort({ updatedAt: -1 }).limit(limit);
  const shaped = access.shapeMany(docs);

  if (sp.get('mode') === 'lookup') {
    return NextResponse.json(shaped.map((r) => ({ _id: r._id, name: recordName(access, r) })));
  }
  return NextResponse.json(shaped);
});

/** POST — create a record (custom objects; built-in objects use their module APIs). */
export const POST = route<P>(async (req, { object }) => {
  const ctx = await getAuthContext();
  const access = await getObjectAccess(ctx, object);
  if (!access.object.isCustom) throw new BadRequestError(`Use the ${access.object.label} API to create ${access.object.pluralLabel}.`);
  const prepared = await access.prepareWrite(await readJson(req));
  const doc = buildCreateDoc(access, prepared, {
    objectApiName: access.object.apiName,
    createdById: ctx.userId,
    lastModifiedById: ctx.userId,
  });
  const created = await CustomRecord.create(doc);
  return NextResponse.json(access.shape(created), { status: 201 });
});
