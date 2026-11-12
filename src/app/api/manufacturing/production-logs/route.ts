import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MfgProductionLog from '@/models/MfgProductionLog';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    const { searchParams } = new URL(req.url);
    const workOrderId = searchParams.get('workOrderId');
    const machineId = searchParams.get('machineId');
    const date = searchParams.get('date');

    const filter: Record<string, unknown> = {};
    if (workOrderId) filter.workOrderId = workOrderId;
    if (machineId) filter.machineId = machineId;
    if (date) filter.date = date;
    const items = await MfgProductionLog.find(t.where(filter)).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching production logs:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const body = await req.json();
    if (!body.date) {
      return NextResponse.json({ error: 'date required' }, { status: 400 });
    }
    const item = await MfgProductionLog.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating production log:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const item = await MfgProductionLog.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Production log not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating production log:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await MfgProductionLog.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Production log not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting production log:');
  }
}
