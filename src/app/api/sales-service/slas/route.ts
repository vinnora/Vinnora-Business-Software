import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import SLA from '@/models/SLA';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const slas = await SLA.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json(slas);
  } catch (error) {
    console.error('Error fetching SLAs:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const body = await req.json();
    if (!body.name || !body.firstResponseMinutes || !body.resolutionMinutes) {
      return NextResponse.json(
        { error: 'name, firstResponseMinutes, resolutionMinutes are required' },
        { status: 400 }
      );
    }

    const sla = await SLA.create({ ...body, userId });
    return NextResponse.json(sla, { status: 201 });
  } catch (error) {
    console.error('Error creating SLA:', error);
    return NextResponse.json({ error: 'Failed to create SLA' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const sla = await SLA.findByIdAndUpdate(_id, updates, { new: true });
    return NextResponse.json(sla);
  } catch (error) {
    console.error('Error updating SLA:', error);
    return NextResponse.json({ error: 'Failed to update SLA' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await SLA.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting SLA:', error);
    return NextResponse.json({ error: 'Failed to delete SLA' }, { status: 500 });
  }
}
