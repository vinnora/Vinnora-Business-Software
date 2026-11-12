import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MktContentAsset from '@/models/MktContentAsset';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const folder = searchParams.get('folder');

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (folder) filter.folder = folder;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const items = await MktContentAsset.find(t.where(filter)).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching content assets:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    if (!body.name || !body.fileUrl) {
      return NextResponse.json({ error: 'name and fileUrl required' }, { status: 400 });
    }
    const item = await MktContentAsset.create({ ...sanitize(body), ...t.stamp() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating content asset:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const body = await req.json();
    const id = recordId(body._id);
    const item = await MktContentAsset.findOneAndUpdate(t.where({ _id: id }), sanitize(body), { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Content asset not found');
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating content asset:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');
    t.requireWrite();
    const id = recordId(new URL(req.url).searchParams.get('id'));
    const res = await MktContentAsset.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Content asset not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting content asset:');
  }
}
