import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import HrmApplicant from '@/models/HrmApplicant';
import HrmJobPosting from '@/models/HrmJobPosting';
import { runHrmWorkflows } from '@/lib/hrm-workflows';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    const { searchParams } = new URL(req.url);
    const jobPostingId = searchParams.get('jobPostingId');
    const stage = searchParams.get('stage');
    const search = searchParams.get('search');

    const filter: Record<string, unknown> = {};
    if (jobPostingId) filter.jobPostingId = jobPostingId;
    if (stage) filter.stage = stage;
    if (search) { filter.$or = [{ firstName: { $regex: search, $options: 'i' } }, { lastName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }]; }
    const items = await HrmApplicant.find(t.where(filter)).sort({ createdAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching applicants:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body.jobPostingId || !body.firstName || !body.lastName || !body.email) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    // The job posting must belong to this workspace.
    const jobPostingId = recordId(body.jobPostingId);
    const posting = await HrmJobPosting.exists(t.where({ _id: jobPostingId }));
    if (!posting) throw new NotFoundError('Job posting not found');
    const stamp = t.stamp();
    const item = await HrmApplicant.create({ ...sanitize(body), ...stamp, jobPostingId });
    // Count the applicant only once it is saved.
    await HrmJobPosting.updateOne(t.where({ _id: jobPostingId }), { $inc: { applicantCount: 1 } });
    await runHrmWorkflows({ objectType: 'Applicant', event: 'created', record: item, userId: stamp.userId, scope: t.where() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating applicant:');
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
    const item = await HrmApplicant.findOneAndUpdate(t.where({ _id: recordId(body._id) }), updates, { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Applicant not found');
    await runHrmWorkflows({ objectType: 'Applicant', event: 'fieldChanged', record: item, userId: item.userId, scope: t.where(), changedFields: Object.keys(updates) });
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating applicant:');
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
    const app = await HrmApplicant.findOneAndDelete(t.where({ _id: recordId(rawId) }));
    if (!app) throw new NotFoundError('Applicant not found');
    if (app.jobPostingId && mongoose.isValidObjectId(app.jobPostingId)) {
      await HrmJobPosting.updateOne(t.where({ _id: app.jobPostingId }), { $inc: { applicantCount: -1 } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting applicant:');
  }
}
