import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MktLead from '@/models/MktLead';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const source = searchParams.get('source');
    const stage = searchParams.get('stage');
    const campaignId = searchParams.get('campaignId');

    const filter: Record<string, unknown> = {};
    if (source) filter.source = source;
    if (stage) filter.stage = stage;
    if (campaignId) filter.campaignId = campaignId;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    const leads = await MktLead.find(t.where(filter)).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(leads);
  } catch (error) {
    return apiError(error, 'Error fetching marketing leads:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();

    const body = await req.json();
    if (!body.firstName || !body.lastName) {
      return NextResponse.json({ error: 'firstName and lastName are required' }, { status: 400 });
    }

    const lead = await MktLead.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating marketing lead:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);

    const lead = await MktLead.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!lead) throw new NotFoundError('Enquiry not found');
    return NextResponse.json(lead);
  } catch (error) {
    return apiError(error, 'Error updating marketing lead:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await MktLead.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Enquiry not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting marketing lead:');
  }
}
