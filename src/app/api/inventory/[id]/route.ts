import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import InventoryItem from '@/models/InventoryItem';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';
import { objectIdWhere } from '../_lib/object-id-scope';

type RouteParams = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: RouteParams }) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    const id = recordId((await params).id);

    const item = await InventoryItem.findOne(objectIdWhere(t, { _id: id }));
    if (!item) throw new NotFoundError('Item not found');

    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error fetching inventory item:');
  }
}

export async function PUT(req: NextRequest, { params }: { params: RouteParams }) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();
    const id = recordId((await params).id);

    const data = await req.json();

    const item = await InventoryItem.findOneAndUpdate(
      objectIdWhere(t, { _id: id }),
      { ...sanitize(data), updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!item) throw new NotFoundError('Item not found');

    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating inventory item:');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: RouteParams }) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();
    const id = recordId((await params).id);

    const item = await InventoryItem.findOneAndDelete(objectIdWhere(t, { _id: id }));
    if (!item) throw new NotFoundError('Item not found');

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    return apiError(error, 'Error deleting inventory item:');
  }
}
