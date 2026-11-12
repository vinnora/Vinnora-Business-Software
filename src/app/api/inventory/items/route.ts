import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Item from '@/models/Item';
import { runInventoryWorkflows, checkAndTriggerReorder } from '@/lib/inventory-workflows';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

function genItemCode() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `ITM-${year}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const lowStock = searchParams.get('lowStock');
    const expiring = searchParams.get('expiring');

    const filter: any = {};
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

    const items = await Item.find(t.where(filter)).sort({ updatedAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching items:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();

    const body = await req.json();
    if (!body.name || !body.category) {
      return NextResponse.json({ error: 'name and category required' }, { status: 400 });
    }

    const item = await Item.create({
      ...sanitize(body),
      ...t.stamp(),
      itemCode: body.itemCode || genItemCode(),
    });

    const ws = { orgId: t.orgId, scope: t.where() };
    await runInventoryWorkflows({
      objectType: 'Item',
      event: 'created',
      record: item,
      userId: item.userId,
      ...ws,
    });
    await checkAndTriggerReorder(item, item.userId, ws);

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating item:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();

    const body = await req.json();
    const { _id, ...rest } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const updates: any = sanitize(rest);

    if (updates.warehouseStocks) {
      updates.totalStock = updates.warehouseStocks.reduce(
        (s: number, w: any) => s + (w.quantity || 0),
        0
      );
    }

    const item = await Item.findOneAndUpdate(t.where({ _id: recordId(_id) }), updates, {
      new: true,
      runValidators: true,
    });
    if (!item) throw new NotFoundError('Item not found');

    const ws = { orgId: t.orgId, scope: t.where() };
    await runInventoryWorkflows({
      objectType: 'Item',
      event: 'fieldChanged',
      record: item,
      userId: item.userId,
      ...ws,
      changedFields: Object.keys(updates),
    });
    await checkAndTriggerReorder(item, item.userId, ws);
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating item:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await Item.deleteOne(t.where({ _id: recordId(id) }));
    if (!res.deletedCount) throw new NotFoundError('Item not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting item:');
  }
}
