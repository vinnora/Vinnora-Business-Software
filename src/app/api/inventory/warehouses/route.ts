import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Warehouse from '@/models/Warehouse';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

function genCode() {
  return 'WH-' + Math.floor(Math.random() * 100000).toString().padStart(5, '0');
}

export async function GET(_req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    const items = await Warehouse.find(t.where()).sort({ name: 1 });
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching warehouses:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const wh = await Warehouse.create({ ...sanitize(body), ...t.stamp(), code: body.code || genCode() });
    return NextResponse.json(wh, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating warehouse:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const wh = await Warehouse.findOneAndUpdate(t.where({ _id: recordId(_id) }), sanitize(updates), {
      new: true,
      runValidators: true,
    });
    if (!wh) throw new NotFoundError('Warehouse not found');
    return NextResponse.json(wh);
  } catch (error) {
    return apiError(error, 'Error updating warehouse:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await Warehouse.deleteOne(t.where({ _id: recordId(id) }));
    if (!res.deletedCount) throw new NotFoundError('Warehouse not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting warehouse:');
  }
}
