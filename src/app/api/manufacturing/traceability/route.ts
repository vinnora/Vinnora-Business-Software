import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MfgTraceabilityLog from '@/models/MfgTraceabilityLog';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    const { searchParams } = new URL(req.url);
    const batchNumber = searchParams.get('batchNumber');
    const workOrderId = searchParams.get('workOrderId');
    const stage = searchParams.get('stage');

    const filter: Record<string, unknown> = {};
    if (batchNumber) filter.batchNumber = batchNumber;
    if (workOrderId) filter.workOrderId = workOrderId;
    if (stage) filter.stage = stage;
    const items = await MfgTraceabilityLog.find(t.where(filter)).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching traceability logs:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const body = await req.json();
    if (!body.batchNumber) {
      return NextResponse.json({ error: 'batchNumber required' }, { status: 400 });
    }
    const item = await MfgTraceabilityLog.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating traceability log:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const item = await MfgTraceabilityLog.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Traceability log not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating traceability log:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await MfgTraceabilityLog.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Traceability log not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting traceability log:');
  }
}
