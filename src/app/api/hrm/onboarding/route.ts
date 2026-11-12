import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HrmOnboarding from '@/models/HrmOnboarding';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    const items = await HrmOnboarding.find(t.where(filter)).sort({ createdAt: -1 }).limit(200);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching onboarding records:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body.employeeId || !body.employeeName || !body.startDate) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    const item = await HrmOnboarding.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating onboarding record:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const item = await HrmOnboarding.findOneAndUpdate(t.where({ _id: recordId(body._id) }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Onboarding record not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating onboarding record:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get('id');
    if (!rawId) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await HrmOnboarding.deleteOne(t.where({ _id: recordId(rawId) }));
    if (!res.deletedCount) throw new NotFoundError('Onboarding record not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting onboarding record:');
  }
}
