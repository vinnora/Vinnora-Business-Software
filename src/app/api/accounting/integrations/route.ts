import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Integration from '@/models/Integration';
import crypto from 'crypto';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(_req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    const items = await Integration.find(t.where()).sort({ createdAt: -1 });
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching integrations:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();
    const body = await req.json();
    if (!body.name || !body.type) {
      return NextResponse.json({ error: 'name and type required' }, { status: 400 });
    }
    const config = body.config || {};
    if (body.type === 'api-token' && !config.token) {
      config.token = `vbsk_${crypto.randomBytes(24).toString('hex')}`;
    }
    const item = await Integration.create({ ...sanitize(body), ...t.stamp(), config });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating integration:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();
    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const item = await Integration.findOneAndUpdate(t.where({ _id: recordId(body._id) }), sanitize(body), {
      new: true,
      runValidators: true,
    });
    if (!item) throw new NotFoundError('Integration not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating integration:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();
    const raw = new URL(req.url).searchParams.get('id');
    if (!raw) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await Integration.deleteOne(t.where({ _id: recordId(raw) }));
    if (!res.deletedCount) throw new NotFoundError('Integration not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting integration:');
  }
}
