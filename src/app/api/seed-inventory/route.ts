import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import InventoryItem from '@/models/InventoryItem';
import { getTenant, apiError } from '@/lib/tenant';
import { objectIdWhere } from '@/app/api/inventory/_lib/object-id-scope';

const mockInventoryData = [
  {
    name: 'Stainless Steel Bolts M8',
    description: 'High tensile stainless steel bolts, grade 8.8',
    category: 'Raw Materials',
    quantity: 450,
    unit: 'pcs',
    reorderPoint: 100,
    price: 2.5,
    location: 'Shelf A1',
    supplier: 'Kumar Hardware Suppliers',
    purchaseDate: new Date('2024-01-15'),
    batchNumber: 'KHS-2024-001',
    minStock: 100,
    maxStock: 500,
  },
  {
    name: 'Aluminum Sheet 2mm',
    description: '2mm thickness aluminum sheets for fabrication',
    category: 'Raw Materials',
    quantity: 85,
    unit: 'sheets',
    reorderPoint: 50,
    price: 150,
    location: 'Rack B2',
    supplier: 'Metallic Industries',
    purchaseDate: new Date('2024-02-10'),
    batchNumber: 'MI-2024-045',
    minStock: 50,
    maxStock: 200,
  },
  {
    name: 'Copper Wire 2.5mm',
    description: 'Electrical grade copper wire',
    category: 'Raw Materials',
    quantity: 320,
    unit: 'meters',
    reorderPoint: 200,
    price: 45,
    location: 'Shelf C3',
    supplier: 'Electrical Supplies Ltd',
    purchaseDate: new Date('2024-01-20'),
    batchNumber: 'ESL-2024-012',
    minStock: 200,
    maxStock: 400,
  },
  {
    name: 'Plastic Injection Molds',
    description: 'Custom designed injection molds in progress',
    category: 'Work in Process',
    quantity: 12,
    unit: 'pcs',
    reorderPoint: 5,
    price: 5000,
    location: 'Production Floor',
    supplier: 'Internal Production',
    purchaseDate: new Date('2024-03-01'),
    batchNumber: 'PROD-WIP-001',
    minStock: 5,
    maxStock: 20,
  },
  {
    name: 'Electronic Circuit Boards',
    description: 'PCB assemblies partially completed',
    category: 'Work in Process',
    quantity: 35,
    unit: 'pcs',
    reorderPoint: 10,
    price: 350,
    location: 'Assembly Station B',
    supplier: 'Electronics Division',
    purchaseDate: new Date('2024-02-28'),
    batchNumber: 'PROD-WIP-002',
    minStock: 10,
    maxStock: 50,
  },
  {
    name: 'Metal Brackets - Type A',
    description: 'Finished metal brackets, ready for packaging',
    category: 'Finished Goods',
    quantity: 2000,
    unit: 'pcs',
    reorderPoint: 500,
    price: 15,
    location: 'Warehouse A',
    supplier: 'Internal Production',
    purchaseDate: new Date('2024-03-05'),
    batchNumber: 'FG-2024-001',
    minStock: 500,
    maxStock: 3000,
  },
  {
    name: 'Plastic Enclosures - Box 100',
    description: 'Finished plastic enclosure boxes for electronics',
    category: 'Finished Goods',
    quantity: 450,
    unit: 'pcs',
    reorderPoint: 200,
    price: 8.5,
    location: 'Warehouse B',
    supplier: 'Plastic Pack Industries',
    purchaseDate: new Date('2024-02-20'),
    batchNumber: 'EB-2024-045',
    minStock: 200,
    maxStock: 1000,
  },
  {
    name: 'Industrial Oil - 5L',
    description: 'Machine maintenance oil, 5 liter containers',
    category: 'Finished Goods',
    quantity: 75,
    unit: 'containers',
    reorderPoint: 30,
    price: 250,
    location: 'Storage Room',
    supplier: 'Lubricants Co',
    purchaseDate: new Date('2024-01-10'),
    expiryDate: new Date('2025-01-10'),
    batchNumber: 'LUB-2024-08',
    minStock: 30,
    maxStock: 100,
  },
  {
    name: 'Safety Gloves - XL',
    description: 'Industrial safety gloves, extra large size',
    category: 'MRO Supplies',
    quantity: 15,
    unit: 'boxes',
    reorderPoint: 20,
    price: 180,
    location: 'Safety Cabinet',
    supplier: 'SafetyFirst Ltd',
    purchaseDate: new Date('2024-02-15'),
    batchNumber: 'SF-2024-34',
    minStock: 20,
    maxStock: 50,
  },
  {
    name: 'Cleaning Supplies - Bulk',
    description: 'General purpose industrial cleaning supplies',
    category: 'MRO Supplies',
    quantity: 12,
    unit: 'boxes',
    reorderPoint: 15,
    price: 450,
    location: 'Maintenance Store',
    supplier: 'CleanTech Solutions',
    purchaseDate: new Date('2024-03-01'),
    expiryDate: new Date('2025-03-01'),
    batchNumber: 'CTS-2024-22',
    minStock: 15,
    maxStock: 40,
  },
  {
    name: 'Welding Rods ER70S-6',
    description: 'Professional welding rods for structural work',
    category: 'MRO Supplies',
    quantity: 280,
    unit: 'pcs',
    reorderPoint: 100,
    price: 12,
    location: 'Welding Shop',
    supplier: 'Welding Supplies Inc',
    purchaseDate: new Date('2024-02-05'),
    batchNumber: 'WS-2024-156',
    minStock: 100,
    maxStock: 500,
  },
  {
    name: 'Steel Tubing 25mm x 2mm',
    description: 'Seamless steel tubing for structural applications',
    category: 'Raw Materials',
    quantity: 42,
    unit: 'meters',
    reorderPoint: 50,
    price: 85,
    location: 'Rack D1',
    supplier: 'Steel Traders',
    purchaseDate: new Date('2024-02-28'),
    batchNumber: 'ST-2024-089',
    minStock: 50,
    maxStock: 150,
  },
  {
    name: 'Rubber Gaskets 50mm',
    description: 'Industrial rubber gaskets for sealing',
    category: 'Raw Materials',
    quantity: 600,
    unit: 'pcs',
    reorderPoint: 200,
    price: 5.5,
    location: 'Shelf E2',
    supplier: 'Rubber Seal Ltd',
    purchaseDate: new Date('2024-01-25'),
    batchNumber: 'RS-2024-047',
    minStock: 200,
    maxStock: 1000,
  },
];

export async function POST(_request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Sample data is not available in production.' }, { status: 403 });
    }
    await dbConnect();
    const t = await getTenant('inventory');
    t.requireAdmin();

    // Never replace real data: only seed an empty workspace.
    const existing = await InventoryItem.countDocuments(objectIdWhere(t));
    if (existing > 0) {
      return NextResponse.json(
        { error: `This workspace already has ${existing} inventory item(s). Sample data is only added to an empty workspace.` },
        { status: 409 },
      );
    }

    const createdItems = await InventoryItem.insertMany(mockInventoryData.map((item) => ({ ...item, userId: t.id })));

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdItems.length} sample inventory items`,
      itemCount: createdItems.length,
      items: createdItems,
    });
  } catch (error) {
    return apiError(error, 'Failed to seed sample data:');
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST (as a workspace admin, outside production) to add 12 sample items to an empty workspace.',
  });
}
