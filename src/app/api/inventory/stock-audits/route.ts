import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import StockAudit from '@/models/StockAudit';
import Item from '@/models/Item';

function genAuditNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `AUDIT-${year}-${random}`;
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
    const items = await StockAudit.find(filter).sort({ scheduledDate: -1 }).limit(200);
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

    // Auto-populate lines with current stock for the warehouse
    let lines = body.lines || [];
    if (lines.length === 0 && body.warehouseId) {
      const items = await Item.find({ userId }).limit(500);
      lines = items
        .map((item: any) => {
          const ws = item.warehouseStocks.find((w: any) => w.warehouseId === body.warehouseId);
          if (!ws) return null;
          return {
            itemId: String(item._id),
            itemCode: item.itemCode,
            itemName: item.name,
            systemQuantity: ws.quantity,
            countedQuantity: 0,
            variance: 0,
            varianceValue: 0,
          };
        })
        .filter(Boolean);
    }

    const audit = await StockAudit.create({
      ...body,
      userId,
      auditNumber: body.auditNumber || genAuditNumber(),
      lines,
      totalItemsAudited: lines.length,
    });
    return NextResponse.json(audit, { status: 201 });
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

    const audit = await StockAudit.findById(_id);
    if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (action === 'reconcile') {
      // Apply variances to actual item warehouse stocks
      for (const line of audit.lines) {
        if (line.variance === 0) continue;
        const item = await Item.findById(line.itemId);
        if (!item) continue;
        const idx = item.warehouseStocks.findIndex(
          (w: any) => w.warehouseId === audit.warehouseId
        );
        if (idx >= 0) {
          item.warehouseStocks[idx].quantity = line.countedQuantity;
        }
        item.totalStock = item.warehouseStocks.reduce(
          (s: number, w: any) => s + (w.quantity || 0),
          0
        );
        await item.save();
      }
      audit.status = 'completed';
      audit.completedAt = new Date();
      await audit.save();
      return NextResponse.json(audit);
    }

    if (updates.lines) {
      let varianceCount = 0;
      let totalVarianceValue = 0;
      updates.lines = updates.lines.map((l: any) => {
        l.variance = (l.countedQuantity || 0) - (l.systemQuantity || 0);
        l.varianceValue = l.variance * (l.unitCost || 0);
        if (l.variance !== 0) varianceCount++;
        totalVarianceValue += l.varianceValue;
        return l;
      });
      updates.itemsWithVariance = varianceCount;
      updates.totalVarianceValue = totalVarianceValue;
      updates.totalItemsAudited = updates.lines.length;
    }

    const updated = await StockAudit.findByIdAndUpdate(_id, updates, { new: true });
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
    await StockAudit.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
