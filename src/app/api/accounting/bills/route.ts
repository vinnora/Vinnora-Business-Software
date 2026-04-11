import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Bill from '@/models/Bill';
import { runAccountingWorkflows } from '@/lib/accounting-workflows';

// Generate bill number
function generateBillNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `BILL-${year}${month}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendorId');

    const filter: any = { userId };
    if (status) filter.status = status;
    if (vendorId) filter.vendorId = vendorId;

    const bills = await Bill.find(filter).sort({ billDate: -1 }).limit(50);
    return NextResponse.json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    if (updates.status === 'paid') {
      const bill = await Bill.findById(_id);
      if (bill) {
        updates.amountPaid = bill.total;
        updates.amountDue = 0;
      }
    }
    const bill = await Bill.findByIdAndUpdate(_id, updates, { new: true });
    if (bill) {
      await runAccountingWorkflows({ objectType: 'Bill', event: 'fieldChanged', record: bill, userId: bill.userId, changedFields: Object.keys(updates) });
    }
    return NextResponse.json(bill);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await Bill.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const body = await req.json();
    const {
      vendorId,
      vendorName,
      email,
      billDate,
      dueDate,
      lineItems,
      tax,
      purchaseOrderNumber,
      notes,
    } = body;

    if (!vendorId || !vendorName || !lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate totals
    const subtotal = lineItems.reduce(
      (sum: number, item: any) => sum + (item.quantity * item.unitPrice),
      0
    );
    const totalTax = tax || 0;
    const total = subtotal + totalTax;

    const bill = new Bill({
      userId,
      billNumber: generateBillNumber(),
      vendorId,
      vendorName,
      email,
      billDate: billDate || new Date(),
      dueDate,
      lineItems,
      subtotal,
      tax: totalTax,
      total,
      amountDue: total,
      currency: 'INR',
      status: 'draft',
      purchaseOrderNumber,
      notes,
    });

    await bill.save();
    await runAccountingWorkflows({ objectType: 'Bill', event: 'created', record: bill, userId });

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error('Error creating bill:', error);
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 });
  }
}
