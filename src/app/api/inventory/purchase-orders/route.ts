import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';
import Item from '@/models/Item';
import { runInventoryWorkflows } from '@/lib/inventory-workflows';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';
import { isObjectIdString } from '../_lib/object-id-scope';

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
    const t = await getTenant('inventory');
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
    const filter: any = {};
    if (status) filter.status = status;
    if (supplierId) filter.supplierId = supplierId;
    const items = await PurchaseOrder.find(t.where(filter)).sort({ orderDate: -1 }).limit(200);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching purchase orders:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();
    const body = await req.json();
    if (!body.supplierId || !body.lines || body.lines.length === 0) {
      return NextResponse.json({ error: 'supplierId and lines required' }, { status: 400 });
    }
    const totals = calcTotals(body.lines, body.shippingCost || 0);
    const po = await PurchaseOrder.create({
      ...sanitize(body),
      ...totals,
      ...t.stamp(),
      poNumber: body.poNumber || genPONumber(),
    });
    await runInventoryWorkflows({
      objectType: 'PurchaseOrder',
      event: 'created',
      record: po,
      userId: po.userId,
      orgId: t.orgId,
      scope: t.where(),
    });
    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating purchase order:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();
    const body = await req.json();
    const { _id, receiveAll, ...rest } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const updates: any = sanitize(rest);
    const poId = recordId(_id);

    const existing = await PurchaseOrder.findOne(t.where({ _id: poId }));
    if (!existing) throw new NotFoundError('Purchase order not found');

    if (receiveAll) {
      // Mark fully received and increment item warehouse stocks
      existing.lines = existing.lines.map((l: any) => ({
        ...l.toObject(),
        receivedQuantity: l.quantity,
      }));
      existing.status = 'received';
      existing.receivedDate = new Date();

      for (const line of existing.lines) {
        if (!isObjectIdString(line.itemId)) continue;
        const item = await Item.findOne(t.where({ _id: line.itemId }));
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
        orgId: t.orgId,
        scope: t.where(),
      });
      return NextResponse.json(existing);
    }

    if (updates.lines) {
      const totals = calcTotals(updates.lines, updates.shippingCost ?? existing.shippingCost);
      Object.assign(updates, totals);
    }

    const po = await PurchaseOrder.findOneAndUpdate(t.where({ _id: poId }), updates, {
      new: true,
      runValidators: true,
    });
    if (!po) throw new NotFoundError('Purchase order not found');
    return NextResponse.json(po);
  } catch (error) {
    return apiError(error, 'Error updating purchase order:');
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
    const res = await PurchaseOrder.deleteOne(t.where({ _id: recordId(id) }));
    if (!res.deletedCount) throw new NotFoundError('Purchase order not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting purchase order:');
  }
}
