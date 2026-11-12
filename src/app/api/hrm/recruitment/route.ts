import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HrmJobPosting from '@/models/HrmJobPosting';
import { runHrmWorkflows } from '@/lib/hrm-workflows';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const department = searchParams.get('department');

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (search) { filter.$or = [{ title: { $regex: search, $options: 'i' } }, { department: { $regex: search, $options: 'i' } }]; }
    const items = await HrmJobPosting.find(t.where(filter)).sort({ updatedAt: -1 }).limit(200);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching job postings:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body.title || !body.department) return NextResponse.json({ error: 'title and department required' }, { status: 400 });
    const stamp = t.stamp();
    const item = await HrmJobPosting.create({ ...sanitize(body), ...stamp });
    await runHrmWorkflows({ objectType: 'JobPosting', event: 'created', record: item, userId: stamp.userId, scope: t.where() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating job posting:');
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
    const item = await HrmJobPosting.findOneAndUpdate(t.where({ _id: recordId(body._id) }), updates, { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Job posting not found');
    await runHrmWorkflows({ objectType: 'JobPosting', event: 'fieldChanged', record: item, userId: item.userId, scope: t.where(), changedFields: Object.keys(updates) });
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating job posting:');
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
    const res = await HrmJobPosting.deleteOne(t.where({ _id: recordId(rawId) }));
    if (!res.deletedCount) throw new NotFoundError('Job posting not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting job posting:');
  }
}
