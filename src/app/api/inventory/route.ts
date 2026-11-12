import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import InventoryItem from '@/models/InventoryItem';
import { getTenant, apiError } from '@/lib/tenant';
import { objectIdWhere } from './_lib/object-id-scope';

export async function GET(_request: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');

    const items = await InventoryItem.find(objectIdWhere(t)).sort({ createdAt: -1 });

    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching inventory items:');
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireWrite();

    const { name, description, category, quantity, unit, reorderPoint, price, location, supplier, purchaseDate, expiryDate, batchNumber, minStock, maxStock } = await request.json();

    if (!name || quantity === undefined) {
      return NextResponse.json({ error: 'Name and quantity are required' }, { status: 400 });
    }

    // InventoryItem has no orgId field: the strict schema drops it and the record is owned by the user id.
    const item = await InventoryItem.create({
      ...t.stamp('id'),
      name,
      description,
      category,
      quantity,
      unit,
      reorderPoint,
      price,
      location,
      supplier,
      purchaseDate,
      expiryDate,
      batchNumber,
      minStock,
      maxStock,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating inventory item:');
  }
}
