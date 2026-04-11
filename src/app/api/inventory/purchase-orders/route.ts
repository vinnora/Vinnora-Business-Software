import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';
import Item from '@/models/Item';
import { runInventoryWorkflows } from '@/lib/inventory-workflows';

function genPONumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `PO-${year}-${random}`;
}

function calcTotals(lines: any[], shippingCost = 0) {
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;
  for (const l of lines) {
    const lineSub = (l.quantity || 0) * (l.unitCost || 0);
    const lineDisc = l.discount || 0;
    const lineTax = ((lineSub - lineDisc) * (l.taxRate || 0)) / 100;
    l.total = lineSub - lineDisc + lineTax;
    subtotal += lineSub;
    discountTotal += lineDisc;
    taxTotal += lineTax;
  }
  return {
    subtotal,
    taxTotal,
    discountTotal,
    total: subtotal - discountTotal + taxTotal + shippingCost,
  };
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
    const filter: any = { userId };
    if (status) filter.status = status;
    if (supplierId) filter.supplierId = supplierId;
    const items = await PurchaseOrder.find(filter).sort({ orderDate: -1 }).limit(200);
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
    if (!body.supplierId || !body.lines || body.lines.length === 0) {
      return NextResponse.json({ error: 'supplierId and lines required' }, { status: 400 });
    }
    const totals = calcTotals(body.lines, body.shippingCost || 0);
    const po = await PurchaseOrder.create({
      ...body,
      ...totals,
      userId,
      poNumber: body.poNumber || genPONumber(),
    });
    await runInventoryWorkflows({
      objectType: 'PurchaseOrder',
      event: 'created',
      record: po,
      userId,
    });
    return NextResponse.json(po, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, receiveAll, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });

    const existing = await PurchaseOrder.findById(_id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (receiveAll) {
      // Mark fully received and increment item warehouse stocks
      existing.lines = existing.lines.map((l: any) => ({
        ...l.toObject(),
        receivedQuantity: l.quantity,
      }));
      existing.status = 'received';
      existing.receivedDate = new Date();

      for (const line of existing.lines) {
        const item = await Item.findById(line.itemId);
        if (!item) continue;
        if (existing.warehouseId) {
          const idx = item.warehouseStocks.findIndex(
            (w: any) => w.warehouseId === existing.warehouseId
          );
          if (idx >= 0) {
            item.warehouseStocks[idx].quantity += line.quantity;
          } else {
            item.warehouseStocks.push({
              warehouseId: existing.warehouseId,
              warehouseName: existing.warehouseName || '',
              quantity: line.quantity,
              reservedQuantity: 0,
            });
          }
        }
        item.totalStock = item.warehouseStocks.reduce(
          (s: number, w: any) => s + (w.quantity || 0),
          0
        );
        await item.save();
      }
      await existing.save();
      await runInventoryWorkflows({
        objectType: 'PurchaseOrder',
        event: 'received',
        record: existing,
        userId: existing.userId,
      });
      return NextResponse.json(existing);
    }

    if (updates.lines) {
      const totals = calcTotals(updates.lines, updates.shippingCost ?? existing.shippingCost);
      Object.assign(updates, totals);
    }

    const po = await PurchaseOrder.findByIdAndUpdate(_id, updates, { new: true });
    return NextResponse.json(po);
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
    await PurchaseOrder.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
