import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAuthContext } from '@/lib/auth-helpers';
import { getObjectAccess, buildCreateDoc, buildUpdate } from '@/lib/platform/access';
import { BadRequestError, NotFoundError, platformErrorResponse } from '@/lib/platform/errors';
import Account from '@/models/Account';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Account');
    access.assert('read');

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const accounts = await Account.find({ $and: [await access.readFilter(), filter] })
      .sort({ updatedAt: -1 })
      .limit(200);
    return NextResponse.json(access.shapeMany(accounts));
  } catch (error) {
    return platformErrorResponse(error, 'Error fetching accounts:');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Account');
    const body = await req.json();

    const prepared = await access.prepareWrite(body, undefined, { passthrough: true });
    const account = await Account.create(buildCreateDoc(access, prepared));
    return NextResponse.json(access.shape(account), { status: 201 });
  } catch (error) {
    return platformErrorResponse(error, 'Error creating account:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Account');
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) throw new BadRequestError('_id required');
    if (!mongoose.isValidObjectId(_id)) throw new BadRequestError('Invalid _id');

    const existing = await Account.findOne({ $and: [{ _id }, await access.readFilter()] });
    if (!existing) throw new NotFoundError('Company not found');

    const prepared = await access.prepareWrite(updates, existing, { passthrough: true });
    const account = await Account.findByIdAndUpdate(_id, buildUpdate(access, prepared), { new: true });
    return NextResponse.json(access.shape(account));
  } catch (error) {
    return platformErrorResponse(error, 'Error updating account:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Account');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new BadRequestError('id required');
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid id');

    const existing = await Account.findOne({ $and: [{ _id: id }, await access.readFilter()] });
    if (!existing) throw new NotFoundError('Company not found');
    access.assert('delete');

    await Account.deleteOne({ _id: existing._id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return platformErrorResponse(error, 'Error deleting account:');
  }
}
