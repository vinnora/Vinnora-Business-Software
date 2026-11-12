import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import MktLead from '@/models/MktLead';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const source = searchParams.get('source');
    const stage = searchParams.get('stage');
    const campaignId = searchParams.get('campaignId');

    const filter: any = { userId };
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

    const leads = await MktLead.find(filter).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching marketing leads:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const body = await req.json();
    if (!body.firstName || !body.lastName) {
      return NextResponse.json({ error: 'firstName and lastName are required' }, { status: 400 });
    }

    const lead = await MktLead.create({ ...body, userId });
    return NextResponse.json(lead, { status: 201 });
  } catch (error: any) {
    console.error('Error creating marketing lead:', error);
    return NextResponse.json({ error: error.message || 'Failed to create enquiry' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });

    const lead = await MktLead.findByIdAndUpdate(_id, updates, { new: true });
    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await MktLead.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
