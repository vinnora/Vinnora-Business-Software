import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MfgWorkflowRule from '@/models/MfgWorkflowRule';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    const { searchParams } = new URL(req.url);
    const objectType = searchParams.get('objectType');
    const filter: Record<string, unknown> = {};
    if (objectType) filter.objectType = objectType;
    const items = await MfgWorkflowRule.find(t.where(filter)).sort({ createdAt: -1 });
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching workflow rules:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const body = await req.json();
    if (!body.name || !body.objectType || !body.triggerEvent) {
      return NextResponse.json({ error: 'name, objectType and triggerEvent required' }, { status: 400 });
    }
    const item = await MfgWorkflowRule.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating workflow rule:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const item = await MfgWorkflowRule.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Workflow rule not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating workflow rule:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('manufacturing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await MfgWorkflowRule.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Workflow rule not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting workflow rule:');
  }
}
