import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import HrmEmployee from '@/models/HrmEmployee';
import { runHrmWorkflows } from '@/lib/hrm-workflows';

function genEmpId() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `EMP-${year}-${rand}`;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const filter: any = { userId };
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
    const items = await HrmEmployee.find(filter).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const body = await req.json();
    if (!body.firstName || !body.lastName || !body.email || !body.department || !body.designation || !body.joinDate) {
      return NextResponse.json({ error: 'firstName, lastName, email, department, designation and joinDate required' }, { status: 400 });
    }
    const item = await HrmEmployee.create({ ...body, userId, employeeId: body.employeeId || genEmpId() });
    await runHrmWorkflows({ objectType: 'Employee', event: 'created', record: item, userId });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const item = await HrmEmployee.findByIdAndUpdate(_id, updates, { new: true });
    if (item) {
      await runHrmWorkflows({ objectType: 'Employee', event: 'fieldChanged', record: item, userId: item.userId, changedFields: Object.keys(updates) });
    }
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await HrmEmployee.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
