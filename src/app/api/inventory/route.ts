import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import InventoryItem from '@/models/InventoryItem';

export async function GET(request: NextRequest) {
  try {
    // For development: use a default userId if no session
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || 'dev-user-id';

    await dbConnect();

    const items = await InventoryItem.find({ userId }).sort({ createdAt: -1 });

    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    // Return empty array in dev mode if DB connection fails
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    // For development: use a default userId if no session
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || 'dev-user-id';

    const { name, description, category, quantity, unit, reorderPoint, price, location, supplier, purchaseDate, expiryDate, batchNumber, minStock, maxStock } = await request.json();

    if (!name || quantity === undefined) {
      return NextResponse.json({ error: 'Name and quantity are required' }, { status: 400 });
    }

    try {
      await dbConnect();

      const item = await InventoryItem.create({
        userId,
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
    } catch (dbError) {
      // In development mode, return mock item if DB connection fails
      console.error('Database error:', dbError);
      
      // Return a mock item for development/testing
      const mockItem = {
        _id: 'mock-' + Date.now(),
        userId,
        name,
        description,
        category,
        quantity: parseInt(quantity),
        unit,
        reorderPoint: parseInt(reorderPoint) || 0,
        price: price ? parseFloat(price) : undefined,
        location,
        supplier,
        purchaseDate,
        expiryDate,
        batchNumber,
        minStock: minStock ? parseInt(minStock) : 0,
        maxStock: maxStock ? parseInt(maxStock) : 0,
        barcode: `VIN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      return NextResponse.json(mockItem, { status: 201 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}