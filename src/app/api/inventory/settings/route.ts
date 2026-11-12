import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import InventorySetting from '@/models/InventorySetting';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const filter: any = {};
    if (key) filter.picklistKey = key;
    const items = await InventorySetting.find(t.where(filter)).sort({ picklistKey: 1, order: 1 });
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching inventory settings:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();
    const body = await req.json();
    if (!body.picklistKey || !body.value) {
      return NextResponse.json({ error: 'picklistKey and value required' }, { status: 400 });
    }
    const v = await InventorySetting.create({
      ...sanitize(body),
      ...t.stamp(),
      label: body.label || body.value,
    });
    return NextResponse.json(v, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating inventory setting:');
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
    const v = await InventorySetting.findOneAndUpdate(t.where({ _id: recordId(_id) }), sanitize(updates), {
      new: true,
      runValidators: true,
    });
    if (!v) throw new NotFoundError('Setting not found');
    return NextResponse.json(v);
  } catch (error) {
    return apiError(error, 'Error updating inventory setting:');
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
    const res = await InventorySetting.deleteOne(t.where({ _id: recordId(id) }));
    if (!res.deletedCount) throw new NotFoundError('Setting not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting inventory setting:');
  }
}
