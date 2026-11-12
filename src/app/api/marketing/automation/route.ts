import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MktAutomation from '@/models/MktAutomation';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const active = searchParams.get('active');
    const triggerType = searchParams.get('triggerType');

    const filter: Record<string, unknown> = {};
    if (active === 'true') filter.active = true;
    if (active === 'false') filter.active = false;
    if (triggerType) filter.triggerType = triggerType;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const items = await MktAutomation.find(t.where(filter)).sort({ updatedAt: -1 }).limit(200);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching automations:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    if (!body.name || !body.triggerType) {
      return NextResponse.json({ error: 'name and triggerType required' }, { status: 400 });
    }
    const item = await MktAutomation.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating automation:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const item = await MktAutomation.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Automation not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating automation:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await MktAutomation.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Automation not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting automation:');
  }
}
