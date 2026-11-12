import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HrmWorkflowRule from '@/models/HrmWorkflowRule';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    const { searchParams } = new URL(req.url);
    const objectType = searchParams.get('objectType');
    const filter: Record<string, unknown> = {};
    if (objectType) filter.objectType = objectType;
    const items = await HrmWorkflowRule.find(t.where(filter)).sort({ createdAt: -1 });
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching HR workflow rules:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body.name || !body.objectType || !body.triggerEvent) {
      return NextResponse.json({ error: 'name, objectType and triggerEvent required' }, { status: 400 });
    }
    const item = await HrmWorkflowRule.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating HR workflow rule:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const item = await HrmWorkflowRule.findOneAndUpdate(t.where({ _id: recordId(body._id) }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Workflow rule not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating HR workflow rule:');
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
    const res = await HrmWorkflowRule.deleteOne(t.where({ _id: recordId(rawId) }));
    if (!res.deletedCount) throw new NotFoundError('Workflow rule not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting HR workflow rule:');
  }
}
