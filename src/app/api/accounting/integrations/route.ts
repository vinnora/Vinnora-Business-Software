import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Integration from '@/models/Integration';
import crypto from 'crypto';

export async function GET(_req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const items = await Integration.find({ userId }).sort({ createdAt: -1 });
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
    if (!body.name || !body.type) {
      return NextResponse.json({ error: 'name and type required' }, { status: 400 });
    }
    const config = body.config || {};
    if (body.type === 'api-token' && !config.token) {
      config.token = `vbsk_${crypto.randomBytes(24).toString('hex')}`;
    }
    const item = await Integration.create({ ...body, userId, config });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const item = await Integration.findByIdAndUpdate(_id, updates, { new: true });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await Integration.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
