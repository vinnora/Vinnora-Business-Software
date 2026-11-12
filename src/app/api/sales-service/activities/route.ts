import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Activity from '@/models/Activity';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');

    const { searchParams } = new URL(req.url);
    const relatedToId = searchParams.get('relatedToId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (relatedToId) filter.relatedToId = relatedToId;
    if (type) filter.type = type;
    if (status) filter.status = status;

    const activities = await Activity.find(t.where(filter))
      .sort({ dueDate: -1, createdAt: -1 })
      .limit(200);
    return NextResponse.json(activities);
  } catch (error) {
    return apiError(error, 'Error fetching activities:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();

    const body = await req.json();
    if (!body.type || !body.subject) {
      return NextResponse.json(
        { error: 'type and subject are required' },
        { status: 400 }
      );
    }

    const activity = await Activity.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating activity:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();

    const body = await req.json();
    const id = recordId(body._id);
    const updates: Record<string, unknown> = sanitize(body);

    if (updates.status === 'Completed' && !updates.completedAt) {
      updates.completedAt = new Date();
    }

    const activity = await Activity.findOneAndUpdate(t.where({ _id: id }), updates, { new: true, runValidators: true });
    if (!activity) throw new NotFoundError('Follow-up not found');
    return NextResponse.json(activity);
  } catch (error) {
    return apiError(error, 'Error updating activity:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');
    t.requireWrite();

    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await Activity.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Follow-up not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting activity:');
  }
}
