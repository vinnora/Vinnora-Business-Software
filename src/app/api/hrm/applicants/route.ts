import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import HrmApplicant from '@/models/HrmApplicant';
import HrmJobPosting from '@/models/HrmJobPosting';
import { runHrmWorkflows } from '@/lib/hrm-workflows';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const { searchParams } = new URL(req.url);
    const jobPostingId = searchParams.get('jobPostingId');
    const stage = searchParams.get('stage');
    const search = searchParams.get('search');

    const filter: any = { userId };
    if (jobPostingId) filter.jobPostingId = jobPostingId;
    if (stage) filter.stage = stage;
    if (search) { filter.$or = [{ firstName: { $regex: search, $options: 'i' } }, { lastName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }]; }
    const items = await HrmApplicant.find(filter).sort({ createdAt: -1 }).limit(500);
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
    if (!body.jobPostingId || !body.firstName || !body.lastName || !body.email) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    const item = await HrmApplicant.create({ ...body, userId });
    await HrmJobPosting.findByIdAndUpdate(body.jobPostingId, { $inc: { applicantCount: 1 } });
    await runHrmWorkflows({ objectType: 'Applicant', event: 'created', record: item, userId });
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
    const item = await HrmApplicant.findByIdAndUpdate(_id, updates, { new: true });
    if (item) {
      await runHrmWorkflows({ objectType: 'Applicant', event: 'fieldChanged', record: item, userId: item.userId, changedFields: Object.keys(updates) });
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
    const app = await HrmApplicant.findByIdAndDelete(id);
    if (app) await HrmJobPosting.findByIdAndUpdate(app.jobPostingId, { $inc: { applicantCount: -1 } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
