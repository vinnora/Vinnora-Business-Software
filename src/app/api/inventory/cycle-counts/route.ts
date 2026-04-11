import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import CycleCount from '@/models/CycleCount';
import Item from '@/models/Item';

function genCountNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `CC-${year}-${random}`;
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
    const items = await CycleCount.find(filter).sort({ scheduledDate: -1 }).limit(200);
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
    if (!body.warehouseId) {
      return NextResponse.json({ error: 'warehouseId required' }, { status: 400 });
    }

    // Auto-generate lines based on ABC class filter or category
    let lines = body.lines || [];
    if (lines.length === 0) {
      const filter: any = { userId };
      if (body.categoryFilter) filter.category = body.categoryFilter;
      const items = await Item.find(filter).limit(200);
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
      ...body,
      userId,
      countNumber: body.countNumber || genCountNumber(),
      lines,
    });
    return NextResponse.json(cc, { status: 201 });
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

    if (action === 'reconcile') {
      const cc = await CycleCount.findById(_id);
      if (!cc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      for (const line of cc.lines) {
        if (line.variance === 0) continue;
        const item = await Item.findById(line.itemId);
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

    const updated = await CycleCount.findByIdAndUpdate(_id, updates, { new: true });
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
    await CycleCount.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
