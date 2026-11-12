import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HrmPerformanceReview from '@/models/HrmPerformanceReview';
import { runHrmWorkflows } from '@/lib/hrm-workflows';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const filter: Record<string, unknown> = {};
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    if (type) filter.type = type;
    const items = await HrmPerformanceReview.find(t.where(filter)).sort({ updatedAt: -1 }).limit(200);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching performance reviews:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body.employeeId || !body.employeeName || !body.period) return NextResponse.json({ error: 'employeeId, employeeName and period required' }, { status: 400 });
    const stamp = t.stamp();
    const item = await HrmPerformanceReview.create({ ...sanitize(body), ...stamp });
    await runHrmWorkflows({ objectType: 'PerformanceReview', event: 'created', record: item, userId: stamp.userId, scope: t.where() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating performance review:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const updates = sanitize(body);
    const item = await HrmPerformanceReview.findOneAndUpdate(t.where({ _id: recordId(body._id) }), updates, { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Performance review not found');
    await runHrmWorkflows({ objectType: 'PerformanceReview', event: 'fieldChanged', record: item, userId: item.userId, scope: t.where(), changedFields: Object.keys(updates) });
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating performance review:');
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
    const res = await HrmPerformanceReview.deleteOne(t.where({ _id: recordId(rawId) }));
    if (!res.deletedCount) throw new NotFoundError('Performance review not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting performance review:');
  }
}
