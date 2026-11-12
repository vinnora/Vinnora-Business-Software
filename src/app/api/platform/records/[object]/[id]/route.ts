import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAuthContext } from '@/lib/auth-helpers';
import CustomRecord from '@/models/CustomRecord';
import { route, readJson } from '@/lib/platform/api';
import { buildUpdate, getObjectAccess } from '@/lib/platform/access';
import { getStandardObject } from '@/lib/platform/registry';
import { BadRequestError, NotFoundError } from '@/lib/platform/errors';

type P = { object: string; id: string };

async function loadVisible(object: string, id: string) {
  const ctx = await getAuthContext();
  const access = await getObjectAccess(ctx, object);
  access.assert('read');
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Record not found');
  const model = access.object.isCustom ? CustomRecord : getStandardObject(access.object.apiName)?.model;
  if (!model) throw new BadRequestError('Unknown module');
  const doc = await model.findOne({ $and: [{ _id: id }, await access.readFilter()] });
  if (!doc) throw new NotFoundError('Record not found or you do not have access to it');
  return { ctx, access, doc };
}

export const GET = route<P>(async (_req, { object, id }) => {
  const { access, doc } = await loadVisible(object, id);
  return NextResponse.json(access.shape(doc));
});

export const PATCH = route<P>(async (req, { object, id }) => {
  const { ctx, access, doc } = await loadVisible(object, id);
  if (!access.object.isCustom) throw new BadRequestError(`Use the ${access.object.label} API to edit ${access.object.pluralLabel}.`);
  const prepared = await access.prepareWrite(await readJson(req), doc);
  const updated = await CustomRecord.findByIdAndUpdate(id, buildUpdate(access, prepared, { lastModifiedById: ctx.userId }), { new: true });
  return NextResponse.json(access.shape(updated));
});

export const DELETE = route<P>(async (_req, { object, id }) => {
  const { access, doc } = await loadVisible(object, id);
  if (!access.object.isCustom) throw new BadRequestError(`Use the ${access.object.label} API to delete ${access.object.pluralLabel}.`);
  access.assert('delete');
  await doc.deleteOne();
  return NextResponse.json({ success: true });
});
