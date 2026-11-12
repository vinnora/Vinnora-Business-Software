import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MktSocialPost from '@/models/MktSocialPost';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const campaignId = searchParams.get('campaignId');

    const filter: Record<string, unknown> = {};
    if (platform) filter.platform = platform;
    if (status) filter.status = status;
    if (campaignId) filter.campaignId = campaignId;
    if (search) {
      filter.$or = [{ content: { $regex: search, $options: 'i' } }];
    }
    const items = await MktSocialPost.find(t.where(filter)).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching social posts:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    if (!body.platform || !body.content) {
      return NextResponse.json({ error: 'platform and content required' }, { status: 400 });
    }
    const item = await MktSocialPost.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating social post:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const item = await MktSocialPost.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Social post not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating social post:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await MktSocialPost.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Social post not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting social post:');
  }
}
