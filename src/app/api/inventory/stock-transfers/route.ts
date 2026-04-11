import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import StockTransfer from '@/models/StockTransfer';
import Item from '@/models/Item';
import { runInventoryWorkflows } from '@/lib/inventory-workflows';

function genTransferNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `TRF-${year}-${random}`;
}

async function adjustStock(
  itemId: string,
  warehouseId: string,
  warehouseName: string,
  delta: number
) {
  const item = await Item.findById(itemId);
  if (!item) return;
  const idx = item.warehouseStocks.findIndex((w: any) => w.warehouseId === warehouseId);
  if (idx >= 0) {
    item.warehouseStocks[idx].quantity = Math.max(
      0,
      item.warehouseStocks[idx].quantity + delta
    );
  } else if (delta > 0) {
    item.warehouseStocks.push({
      warehouseId,
      warehouseName,
      quantity: delta,
      reservedQuantity: 0,
    });
  }
  item.totalStock = item.warehouseStocks.reduce(
    (s: number, w: any) => s + (w.quantity || 0),
    0
  );
  await item.save();
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const filter: any = { userId };
    if (status) filter.status = status;
    const items = await StockTransfer.find(filter).sort({ initiatedDate: -1 }).limit(200);
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const body = await req.json();
    if (!body.fromWarehouseId || !body.toWarehouseId || !body.lines?.length) {
      return NextResponse.json(
        { error: 'fromWarehouseId, toWarehouseId, lines required' },
        { status: 400 }
      );
    }
    const totalQuantity = body.lines.reduce(
      (s: number, l: any) => s + (l.requestedQuantity || 0),
      0
    );
    const t = await StockTransfer.create({
      ...body,
      userId,
      transferNumber: body.transferNumber || genTransferNumber(),
      totalQuantity,
    });
    return NextResponse.json(t, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, action, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });

    const transfer = await StockTransfer.findById(_id);
    if (!transfer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (action === 'ship') {
      // Decrement from source warehouse
      for (const line of transfer.lines) {
        await adjustStock(
          line.itemId,
          transfer.fromWarehouseId,
          transfer.fromWarehouseName,
          -line.requestedQuantity
        );
        line.shippedQuantity = line.requestedQuantity;
      }
      transfer.status = 'in-transit';
      transfer.shippedDate = new Date();
      await transfer.save();
      await runInventoryWorkflows({
        objectType: 'StockTransfer',
        event: 'shipped',
        record: transfer,
        userId: transfer.userId,
      });
      return NextResponse.json(transfer);
    }

    if (action === 'receive') {
      // Increment at destination warehouse
      for (const line of transfer.lines) {
        await adjustStock(
          line.itemId,
          transfer.toWarehouseId,
          transfer.toWarehouseName,
          line.shippedQuantity
        );
        line.receivedQuantity = line.shippedQuantity;
      }
      transfer.status = 'received';
      transfer.receivedDate = new Date();
      await transfer.save();
      await runInventoryWorkflows({
        objectType: 'StockTransfer',
        event: 'received',
        record: transfer,
        userId: transfer.userId,
      });
      return NextResponse.json(transfer);
    }

    const updated = await StockTransfer.findByIdAndUpdate(_id, updates, { new: true });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await StockTransfer.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
