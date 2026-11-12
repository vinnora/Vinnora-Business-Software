import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HrmAttendance from '@/models/HrmAttendance';
import { runHrmWorkflows } from '@/lib/hrm-workflows';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const filter: Record<string, unknown> = {};
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    if (date) { const d = new Date(date); filter.date = { $gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()), $lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) }; }
    const items = await HrmAttendance.find(t.where(filter)).sort({ date: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching attendance:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body.employeeId || !body.employeeName || !body.date) {
      return NextResponse.json({ error: 'employeeId, employeeName and date required' }, { status: 400 });
    }
    const stamp = t.stamp();
    const item = await HrmAttendance.create({ ...sanitize(body), ...stamp });
    await runHrmWorkflows({ objectType: 'Attendance', event: 'created', record: item, userId: stamp.userId, scope: t.where() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating attendance record:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const item = await HrmAttendance.findOneAndUpdate(t.where({ _id: recordId(body._id) }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Attendance record not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating attendance record:');
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
    const res = await HrmAttendance.deleteOne(t.where({ _id: recordId(rawId) }));
    if (!res.deletedCount) throw new NotFoundError('Attendance record not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting attendance record:');
  }
}
