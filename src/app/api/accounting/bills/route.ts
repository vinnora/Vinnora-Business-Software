import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Bill from '@/models/Bill';
import { runAccountingWorkflows } from '@/lib/accounting-workflows';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

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
    const t = await getTenant('accounting');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendorId');

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (vendorId) filter.vendorId = vendorId;

    const bills = await Bill.find(t.where(filter)).sort({ billDate: -1 }).limit(50);
    return NextResponse.json(bills);
  } catch (error) {
    return apiError(error, 'Error fetching bills:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const id = recordId(body._id);
    const updates: Record<string, unknown> = sanitize(body);
    if (updates.status === 'paid') {
      const existing = await Bill.findOne(t.where({ _id: id }));
      if (!existing) throw new NotFoundError('Bill not found');
      updates.amountPaid = existing.total;
      updates.amountDue = 0;
    }
    const bill = await Bill.findOneAndUpdate(t.where({ _id: id }), updates, { new: true, runValidators: true });
    if (!bill) throw new NotFoundError('Bill not found');
    await runAccountingWorkflows({
      objectType: 'Bill',
      event: 'fieldChanged',
      record: bill,
      userId: bill.userId,
      scope: t.where(),
      changedFields: Object.keys(updates),
    });
    return NextResponse.json(bill);
  } catch (error) {
    return apiError(error, 'Error updating bill:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const raw = new URL(req.url).searchParams.get('id');
    if (!raw) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await Bill.deleteOne(t.where({ _id: recordId(raw) }));
    if (!res.deletedCount) throw new NotFoundError('Bill not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting bill:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

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
      ...t.stamp(),
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
    await runAccountingWorkflows({ objectType: 'Bill', event: 'created', record: bill, userId: bill.userId, scope: t.where() });

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating bill:');
  }
}
