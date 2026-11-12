import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import InventoryItem from '@/models/InventoryItem';
import StockAdjustment from '@/models/StockAdjustment';
import { getTenant, recordId, apiError, NotFoundError } from '@/lib/tenant';
import { objectIdWhere } from '../../_lib/object-id-scope';

type RouteParams = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: RouteParams }) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();
    const id = recordId((await params).id);

    const { adjustmentType, quantityChanged, reason, referenceNumber, notes, location } = await req.json();

    if (!adjustmentType || quantityChanged === undefined) {
      return NextResponse.json(
        { error: 'Adjustment type and quantity are required' },
        { status: 400 }
      );
    }

    // Get the current item
    const item = await InventoryItem.findOne(objectIdWhere(t, { _id: id }));
    if (!item) throw new NotFoundError('Item not found');

    const quantityBefore = item.quantity;
    const quantityAfter = item.quantity + quantityChanged;

    if (quantityAfter < 0) {
      return NextResponse.json(
        { error: 'Insufficient stock for this adjustment' },
        { status: 400 }
      );
    }

    // Update the item quantity
    item.quantity = quantityAfter;
    item.updatedAt = new Date();
    await item.save();

    // Create stock adjustment record (no orgId field on this model: owned by the user id)
    const adjustment = await StockAdjustment.create({
      ...t.stamp('id'),
      itemId: id,
      itemName: item.name,
      adjustmentType,
      quantityChanged,
      quantityBefore,
      quantityAfter,
      reason,
      referenceNumber,
      notes,
      location: location || item.location,
      createdBy: t.email || 'System',
    });

    return NextResponse.json(
      { item, adjustment },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error, 'Error adjusting stock:');
  }
}

export async function GET(_req: NextRequest, { params }: { params: RouteParams }) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    const id = recordId((await params).id);

    const adjustments = await StockAdjustment.find(objectIdWhere(t, { itemId: id }))
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json(adjustments);
  } catch (error) {
    return apiError(error, 'Error fetching stock adjustments:');
  }
}
