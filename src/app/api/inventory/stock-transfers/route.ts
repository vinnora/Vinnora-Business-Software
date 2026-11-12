import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StockTransfer from '@/models/StockTransfer';
import Item from '@/models/Item';
import { runInventoryWorkflows } from '@/lib/inventory-workflows';
import { getTenant, sanitize, recordId, apiError, NotFoundError, type Tenant } from '@/lib/tenant';
import { isObjectIdString } from '../_lib/object-id-scope';

function genTransferNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `TRF-${year}-${random}`;
}

async function adjustStock(
  t: Tenant,
  itemId: string,
  warehouseId: string,
  warehouseName: string,
  delta: number
) {
  if (!isObjectIdString(itemId)) return;
  const item = await Item.findOne(t.where({ _id: itemId }));
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
    const t = await getTenant('inventory');
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const filter: any = {};
    if (status) filter.status = status;
    const items = await StockTransfer.find(t.where(filter)).sort({ initiatedDate: -1 }).limit(200);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching stock transfers:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();
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
    const transfer = await StockTransfer.create({
      ...sanitize(body),
      ...t.stamp(),
      transferNumber: body.transferNumber || genTransferNumber(),
      totalQuantity,
    });
    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating stock transfer:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();
    const body = await req.json();
    const { _id, action, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const transferId = recordId(_id);

    const transfer = await StockTransfer.findOne(t.where({ _id: transferId }));
    if (!transfer) throw new NotFoundError('Stock transfer not found');

    if (action === 'ship') {
      // Decrement from source warehouse
      for (const line of transfer.lines) {
        await adjustStock(
          t,
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
        orgId: t.orgId,
        scope: t.where(),
      });
      return NextResponse.json(transfer);
    }

    if (action === 'receive') {
      // Increment at destination warehouse
      for (const line of transfer.lines) {
        await adjustStock(
          t,
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
        orgId: t.orgId,
        scope: t.where(),
      });
      return NextResponse.json(transfer);
    }

    const updated = await StockTransfer.findOneAndUpdate(t.where({ _id: transferId }), sanitize(updates), {
      new: true,
      runValidators: true,
    });
    if (!updated) throw new NotFoundError('Stock transfer not found');
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error, 'Error updating stock transfer:');
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
    const res = await StockTransfer.deleteOne(t.where({ _id: recordId(id) }));
    if (!res.deletedCount) throw new NotFoundError('Stock transfer not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting stock transfer:');
  }
}
