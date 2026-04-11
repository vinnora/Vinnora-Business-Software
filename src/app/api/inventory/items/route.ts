import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Item from '@/models/Item';
import { runInventoryWorkflows, checkAndTriggerReorder } from '@/lib/inventory-workflows';

function genItemCode() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `ITM-${year}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const lowStock = searchParams.get('lowStock');
    const expiring = searchParams.get('expiring');

    const filter: any = { userId };
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$totalStock', '$reorderPoint'] };
    }
    if (expiring === 'true') {
      filter.expiryDate = {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
    }

    const items = await Item.find(filter).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const body = await req.json();
    if (!body.name || !body.category) {
      return NextResponse.json({ error: 'name and category required' }, { status: 400 });
    }

    const item = await Item.create({
      ...body,
      userId,
      itemCode: body.itemCode || genItemCode(),
    });

    await runInventoryWorkflows({
      objectType: 'Item',
      event: 'created',
      record: item,
      userId,
    });
    await checkAndTriggerReorder(item, userId);

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error('Error creating item:', error);
    return NextResponse.json({ error: error.message || 'Failed to create item' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });

    if (updates.warehouseStocks) {
      updates.totalStock = updates.warehouseStocks.reduce(
        (s: number, w: any) => s + (w.quantity || 0),
        0
      );
    }

    const item = await Item.findByIdAndUpdate(_id, updates, { new: true });
    if (item) {
      await runInventoryWorkflows({
        objectType: 'Item',
        event: 'fieldChanged',
        record: item,
        userId: item.userId,
        changedFields: Object.keys(updates),
      });
      await checkAndTriggerReorder(item, item.userId);
    }
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
    await Item.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
