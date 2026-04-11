import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import MfgPurchaseRequisition from '@/models/MfgPurchaseRequisition';

function genCode(prefix: string) {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${prefix}-${year}-${rand}`;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const department = searchParams.get('department');

    const filter: any = { userId };
    if (status) filter.status = status;
    if (department) filter.department = department;
    const items = await MfgPurchaseRequisition.find(filter).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const body = await req.json();
    const item = await MfgPurchaseRequisition.create({
      ...body,
      userId,
      requisitionNumber: body.requisitionNumber || genCode('PR'),
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const item = await MfgPurchaseRequisition.findByIdAndUpdate(_id, updates, { new: true });
    return NextResponse.json(item);
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
    await MfgPurchaseRequisition.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
