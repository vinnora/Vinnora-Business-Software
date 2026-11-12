import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MfgQualityCheck from '@/models/MfgQualityCheck';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    const { searchParams } = new URL(req.url);
    const workOrderId = searchParams.get('workOrderId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (workOrderId) filter.workOrderId = workOrderId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    const items = await MfgQualityCheck.find(t.where(filter)).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching quality checks:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const body = await req.json();
    if (!body.inspectionDate) {
      return NextResponse.json({ error: 'inspectionDate required' }, { status: 400 });
    }
    const item = await MfgQualityCheck.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating quality check:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const item = await MfgQualityCheck.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Quality check not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating quality check:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await MfgQualityCheck.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Quality check not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting quality check:');
  }
}
