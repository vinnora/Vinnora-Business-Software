import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CycleCount from '@/models/CycleCount';
import Item from '@/models/Item';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';
import { isObjectIdString } from '../_lib/object-id-scope';

function genCountNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `CC-${year}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const filter: any = {};
    if (status) filter.status = status;
    const items = await CycleCount.find(t.where(filter)).sort({ scheduledDate: -1 }).limit(200);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching cycle counts:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();
    const body = await req.json();
    if (!body.warehouseId) {
      return NextResponse.json({ error: 'warehouseId required' }, { status: 400 });
    }

    // Auto-generate lines based on ABC class filter or category
    let lines = body.lines || [];
    if (lines.length === 0) {
      const filter: any = {};
      if (body.categoryFilter) filter.category = body.categoryFilter;
      const items = await Item.find(t.where(filter)).limit(200);
      lines = items
        .map((item: any) => {
          const ws = item.warehouseStocks.find((w: any) => w.warehouseId === body.warehouseId);
          if (!ws) return null;
          // Simple ABC classification by stock value
          const value = (ws.quantity || 0) * (item.costPrice || 0);
          let abcClass: 'A' | 'B' | 'C' = 'C';
          if (value > 50000) abcClass = 'A';
          else if (value > 10000) abcClass = 'B';
          if (body.abcClassFilter && abcClass !== body.abcClassFilter) return null;
          return {
            itemId: String(item._id),
            itemCode: item.itemCode,
            itemName: item.name,
            abcClass,
            systemQuantity: ws.quantity,
            countedQuantity: 0,
            variance: 0,
            status: 'pending',
          };
        })
        .filter(Boolean);
    }

    const cc = await CycleCount.create({
      ...sanitize(body),
      ...t.stamp(),
      countNumber: body.countNumber || genCountNumber(),
      lines,
    });
    return NextResponse.json(cc, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating cycle count:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();
    const body = await req.json();
    const { _id, action, ...rest } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const updates: any = sanitize(rest);
    const countId = recordId(_id);

    if (action === 'reconcile') {
      const cc = await CycleCount.findOne(t.where({ _id: countId }));
      if (!cc) throw new NotFoundError('Cycle count not found');
      for (const line of cc.lines) {
        if (line.variance === 0) continue;
        if (!isObjectIdString(line.itemId)) continue;
        const item = await Item.findOne(t.where({ _id: line.itemId }));
        if (!item) continue;
        const idx = item.warehouseStocks.findIndex(
          (w: any) => w.warehouseId === cc.warehouseId
        );
        if (idx >= 0) {
          item.warehouseStocks[idx].quantity = line.countedQuantity;
        }
        item.totalStock = item.warehouseStocks.reduce(
          (s: number, w: any) => s + (w.quantity || 0),
          0
        );
        await item.save();
        line.status = 'reconciled';
      }
      cc.status = 'completed';
      cc.completedAt = new Date();
      await cc.save();
      return NextResponse.json(cc);
    }

    if (updates.lines) {
      let varianceCount = 0;
      let counted = 0;
      updates.lines = updates.lines.map((l: any) => {
        l.variance = (l.countedQuantity || 0) - (l.systemQuantity || 0);
        if (l.countedQuantity > 0) {
          counted++;
          l.status = l.variance === 0 ? 'counted' : 'counted';
        }
        if (l.variance !== 0) varianceCount++;
        return l;
      });
      updates.itemsCounted = counted;
      updates.itemsWithVariance = varianceCount;
    }

    const updated = await CycleCount.findOneAndUpdate(t.where({ _id: countId }), updates, {
      new: true,
      runValidators: true,
    });
    if (!updated) throw new NotFoundError('Cycle count not found');
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error, 'Error updating cycle count:');
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
    const res = await CycleCount.deleteOne(t.where({ _id: recordId(id) }));
    if (!res.deletedCount) throw new NotFoundError('Cycle count not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting cycle count:');
  }
}
