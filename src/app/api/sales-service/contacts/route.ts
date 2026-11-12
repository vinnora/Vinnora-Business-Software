import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAuthContext } from '@/lib/auth-helpers';
import { getObjectAccess, buildCreateDoc, buildUpdate } from '@/lib/platform/access';
import { BadRequestError, NotFoundError, platformErrorResponse } from '@/lib/platform/errors';
import Contact from '@/models/Contact';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Contact');
    access.assert('read');

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    const search = searchParams.get('search');

    const filter: Record<string, unknown> = {};
    if (accountId) filter.accountId = accountId;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const contacts = await Contact.find({ $and: [await access.readFilter(), filter] })
      .sort({ updatedAt: -1 })
      .limit(200);
    return NextResponse.json(access.shapeMany(contacts));
  } catch (error) {
    return platformErrorResponse(error, 'Error fetching contacts:');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Contact');
    const body = await req.json();

    const prepared = await access.prepareWrite(body, undefined, { passthrough: true });
    const contact = await Contact.create(buildCreateDoc(access, prepared));
    return NextResponse.json(access.shape(contact), { status: 201 });
  } catch (error) {
    return platformErrorResponse(error, 'Error creating contact:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Contact');
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) throw new BadRequestError('_id required');
    if (!mongoose.isValidObjectId(_id)) throw new BadRequestError('Invalid _id');

    const existing = await Contact.findOne({ $and: [{ _id }, await access.readFilter()] });
    if (!existing) throw new NotFoundError('Person not found');

    const prepared = await access.prepareWrite(updates, existing, { passthrough: true });
    const contact = await Contact.findByIdAndUpdate(_id, buildUpdate(access, prepared), { new: true });
    return NextResponse.json(access.shape(contact));
  } catch (error) {
    return platformErrorResponse(error, 'Error updating contact:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthContext('sales-service');
    const access = await getObjectAccess(ctx, 'Contact');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new BadRequestError('id required');
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid id');

    const existing = await Contact.findOne({ $and: [{ _id: id }, await access.readFilter()] });
    if (!existing) throw new NotFoundError('Person not found');
    access.assert('delete');

    await Contact.deleteOne({ _id: existing._id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return platformErrorResponse(error, 'Error deleting contact:');
  }
}
