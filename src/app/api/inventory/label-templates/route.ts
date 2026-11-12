import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import LabelTemplate from '@/models/LabelTemplate';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(_req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    const items = await LabelTemplate.find(t.where()).sort({ createdAt: -1 });
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching label templates:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const tpl = await LabelTemplate.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(tpl, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating label template:');
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
    const tpl = await LabelTemplate.findOneAndUpdate(t.where({ _id: recordId(_id) }), sanitize(updates), {
      new: true,
      runValidators: true,
    });
    if (!tpl) throw new NotFoundError('Label template not found');
    return NextResponse.json(tpl);
  } catch (error) {
    return apiError(error, 'Error updating label template:');
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
    const res = await LabelTemplate.deleteOne(t.where({ _id: recordId(id) }));
    if (!res.deletedCount) throw new NotFoundError('Label template not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting label template:');
  }
}
