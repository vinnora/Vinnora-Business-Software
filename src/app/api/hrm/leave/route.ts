import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HrmLeaveRequest from '@/models/HrmLeaveRequest';
import { runHrmWorkflows } from '@/lib/hrm-workflows';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const leaveType = searchParams.get('leaveType');

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (employeeId) filter.employeeId = employeeId;
    if (leaveType) filter.leaveType = leaveType;
    const items = await HrmLeaveRequest.find(t.where(filter)).sort({ createdAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching leave requests:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body.employeeId || !body.employeeName || !body.leaveType || !body.startDate || !body.endDate || !body.days) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const stamp = t.stamp();
    const item = await HrmLeaveRequest.create({ ...sanitize(body), ...stamp });
    await runHrmWorkflows({ objectType: 'LeaveRequest', event: 'created', record: item, userId: stamp.userId, scope: t.where() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating leave request:');
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
    const item = await HrmLeaveRequest.findOneAndUpdate(t.where({ _id: recordId(body._id) }), updates, { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Leave request not found');
    await runHrmWorkflows({ objectType: 'LeaveRequest', event: 'fieldChanged', record: item, userId: item.userId, scope: t.where(), changedFields: Object.keys(updates) });
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating leave request:');
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
    const res = await HrmLeaveRequest.deleteOne(t.where({ _id: recordId(rawId) }));
    if (!res.deletedCount) throw new NotFoundError('Leave request not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting leave request:');
  }
}
