import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HrmEmployee from '@/models/HrmEmployee';
import { runHrmWorkflows } from '@/lib/hrm-workflows';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

function genEmpId() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `EMP-${year}-${rand}`;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const filter: Record<string, unknown> = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (type) filter.employmentType = type;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
      ];
    }
    const items = await HrmEmployee.find(t.where(filter)).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching employees:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body.firstName || !body.lastName || !body.email || !body.department || !body.designation || !body.joinDate) {
      return NextResponse.json({ error: 'firstName, lastName, email, department, designation and joinDate required' }, { status: 400 });
    }
    const stamp = t.stamp();
    const item = await HrmEmployee.create({ ...sanitize(body), ...stamp, employeeId: body.employeeId || genEmpId() });
    await runHrmWorkflows({ objectType: 'Employee', event: 'created', record: item, userId: stamp.userId, scope: t.where() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating employee:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const id = recordId(body._id);
    const updates = sanitize(body);
    const item = await HrmEmployee.findOneAndUpdate(t.where({ _id: id }), updates, { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Employee not found');
    await runHrmWorkflows({ objectType: 'Employee', event: 'fieldChanged', record: item, userId: item.userId, scope: t.where(), changedFields: Object.keys(updates) });
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating employee:');
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
    const res = await HrmEmployee.deleteOne(t.where({ _id: recordId(rawId) }));
    if (!res.deletedCount) throw new NotFoundError('Employee not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting employee:');
  }
}
