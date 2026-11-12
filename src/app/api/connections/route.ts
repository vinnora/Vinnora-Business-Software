import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AppConnection from '@/models/AppConnection';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant();
    const { searchParams } = new URL(req.url);
    const sourceApp = searchParams.get('sourceApp');
    const targetApp = searchParams.get('targetApp');
    const filter: Record<string, unknown> = {};
    if (sourceApp) filter.sourceApp = sourceApp;
    if (targetApp) filter.targetApp = targetApp;
    const items = await AppConnection.find(t.where(filter)).sort({ createdAt: -1 });
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching connections:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant();
    t.requireWrite();
    const body = await req.json();
    if (!body.name || !body.sourceApp || !body.sourceObject || !body.sourceEvent || !body.targetApp || !body.targetAction) {
      return NextResponse.json({ error: 'name, sourceApp, sourceObject, sourceEvent, targetApp and targetAction required' }, { status: 400 });
    }
    const item = await AppConnection.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating connection:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant();
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const item = await AppConnection.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Connection not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating connection:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant();
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await AppConnection.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Connection not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting connection:');
  }
}
