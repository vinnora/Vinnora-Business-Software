import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MktTask from '@/models/MktTask';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const campaignId = searchParams.get('campaignId');

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (campaignId) filter.campaignId = campaignId;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const items = await MktTask.find(t.where(filter)).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching marketing tasks:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    if (!body.title) {
      return NextResponse.json({ error: 'title required' }, { status: 400 });
    }
    const item = await MktTask.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating marketing task:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const updates: Record<string, unknown> = sanitize(body);
    if (updates.status === 'Done' && !updates.completedAt) {
      updates.completedAt = new Date();
    }
    const item = await MktTask.findOneAndUpdate(t.where({ _id: id }), updates, { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Task not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating marketing task:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await MktTask.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Task not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting marketing task:');
  }
}
