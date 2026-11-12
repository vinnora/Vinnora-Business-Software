import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AppIntegration from '@/models/AppIntegration';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant();
    const { searchParams } = new URL(req.url);
    const app = searchParams.get('app');
    const filter: Record<string, unknown> = {};
    if (app) filter.$or = [{ app }, { app: 'global' }];
    const items = await AppIntegration.find(t.where(filter)).sort({ name: 1 });
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching integrations:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant();
    t.requireWrite();
    const body = await req.json();
    if (!body.name || !body.type || !body.app) {
      return NextResponse.json({ error: 'name, type and app required' }, { status: 400 });
    }
    const item = await AppIntegration.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating integration:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant();
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const item = await AppIntegration.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Integration not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating integration:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant();
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await AppIntegration.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Integration not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting integration:');
  }
}
