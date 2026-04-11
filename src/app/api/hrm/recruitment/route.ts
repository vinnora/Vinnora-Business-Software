import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import HrmJobPosting from '@/models/HrmJobPosting';
import { runHrmWorkflows } from '@/lib/hrm-workflows';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const department = searchParams.get('department');

    const filter: any = { userId };
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (search) { filter.$or = [{ title: { $regex: search, $options: 'i' } }, { department: { $regex: search, $options: 'i' } }]; }
    const items = await HrmJobPosting.find(filter).sort({ updatedAt: -1 }).limit(200);
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
    if (!body.title || !body.department) return NextResponse.json({ error: 'title and department required' }, { status: 400 });
    const item = await HrmJobPosting.create({ ...body, userId });
    await runHrmWorkflows({ objectType: 'JobPosting', event: 'created', record: item, userId });
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
    const item = await HrmJobPosting.findByIdAndUpdate(_id, updates, { new: true });
    if (item) {
      await runHrmWorkflows({ objectType: 'JobPosting', event: 'fieldChanged', record: item, userId: item.userId, changedFields: Object.keys(updates) });
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
    await HrmJobPosting.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
