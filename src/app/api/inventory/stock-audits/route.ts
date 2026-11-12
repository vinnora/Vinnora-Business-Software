import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StockAudit from '@/models/StockAudit';
import Item from '@/models/Item';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';
import { isObjectIdString } from '../_lib/object-id-scope';

function genAuditNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `AUDIT-${year}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const filter: any = {};
    if (status) filter.status = status;
    const items = await StockAudit.find(t.where(filter)).sort({ scheduledDate: -1 }).limit(200);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching stock audits:');
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

    // Auto-populate lines with current stock for the warehouse
    let lines = body.lines || [];
    if (lines.length === 0 && body.warehouseId) {
      const items = await Item.find(t.where()).limit(500);
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
      ...sanitize(body),
      ...t.stamp(),
      auditNumber: body.auditNumber || genAuditNumber(),
      lines,
      totalItemsAudited: lines.length,
    });
    return NextResponse.json(audit, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating stock audit:');
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
    const auditId = recordId(_id);

    const audit = await StockAudit.findOne(t.where({ _id: auditId }));
    if (!audit) throw new NotFoundError('Stock audit not found');

    if (action === 'reconcile') {
      // Apply variances to actual item warehouse stocks
      for (const line of audit.lines) {
        if (line.variance === 0) continue;
        if (!isObjectIdString(line.itemId)) continue;
        const item = await Item.findOne(t.where({ _id: line.itemId }));
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

    const updated = await StockAudit.findOneAndUpdate(t.where({ _id: auditId }), updates, {
      new: true,
      runValidators: true,
    });
    if (!updated) throw new NotFoundError('Stock audit not found');
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error, 'Error updating stock audit:');
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
    const res = await StockAudit.deleteOne(t.where({ _id: recordId(id) }));
    if (!res.deletedCount) throw new NotFoundError('Stock audit not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting stock audit:');
  }
}
