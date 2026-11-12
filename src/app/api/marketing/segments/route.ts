import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MktAudienceSegment from '@/models/MktAudienceSegment';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const items = await MktAudienceSegment.find(t.where(filter)).sort({ updatedAt: -1 }).limit(200);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching audience segments:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }
    const item = await MktAudienceSegment.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating audience segment:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const item = await MktAudienceSegment.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Audience segment not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating audience segment:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await MktAudienceSegment.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Audience segment not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting audience segment:');
  }
}
