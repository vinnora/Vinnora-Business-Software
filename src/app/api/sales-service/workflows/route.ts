import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import WorkflowRule from '@/models/WorkflowRule';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');

    const { searchParams } = new URL(req.url);
    const objectType = searchParams.get('objectType');
    const filter: Record<string, unknown> = {};
    if (objectType) filter.objectType = objectType;

    const rules = await WorkflowRule.find(t.where(filter)).sort({ createdAt: -1 });
    return NextResponse.json(rules);
  } catch (error) {
    return apiError(error, 'Error fetching workflows:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const body = await req.json();
    if (!body.name || !body.objectType || !body.triggerEvent) {
      return NextResponse.json(
        { error: 'name, objectType, triggerEvent required' },
        { status: 400 }
      );
    }
    const rule = await WorkflowRule.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating workflow:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const rule = await WorkflowRule.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!rule) throw new NotFoundError('Workflow not found');
    return NextResponse.json(rule);
  } catch (error) {
    return apiError(error, 'Error updating workflow:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await WorkflowRule.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Workflow not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting workflow:');
  }
}
