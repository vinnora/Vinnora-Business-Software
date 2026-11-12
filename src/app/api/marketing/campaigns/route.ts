import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MktCampaign from '@/models/MktCampaign';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

function genCode() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `MKT-${year}-${rand}`;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const campaigns = await MktCampaign.find(t.where(filter)).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(campaigns);
  } catch (error) {
    return apiError(error, 'Error fetching promotions:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const campaign = await MktCampaign.create({
      ...sanitize(body),
      ...t.stamp(),
      code: genCode(),
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating promotion:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();

    const body = await req.json();
    const id = recordId(body._id);
    const campaign = await MktCampaign.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!campaign) throw new NotFoundError('Promotion not found');
    return NextResponse.json(campaign);
  } catch (error) {
    return apiError(error, 'Error updating promotion:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();

    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await MktCampaign.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Promotion not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting promotion:');
  }
}
