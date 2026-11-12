import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import { runAccountingWorkflows } from '@/lib/accounting-workflows';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

// Generate invoice number
function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;

    const invoices = await Invoice.find(t.where(filter)).sort({ invoiceDate: -1 }).limit(50);
    return NextResponse.json(invoices);
  } catch (error) {
    return apiError(error, 'Error fetching invoices:');
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
      const existing = await Invoice.findOne(t.where({ _id: id }));
      if (!existing) throw new NotFoundError('Invoice not found');
      updates.amountPaid = existing.total;
      updates.amountDue = 0;
    }
    const inv = await Invoice.findOneAndUpdate(t.where({ _id: id }), updates, { new: true, runValidators: true });
    if (!inv) throw new NotFoundError('Invoice not found');
    await runAccountingWorkflows({
      objectType: 'Invoice',
      event: 'fieldChanged',
      record: inv,
      userId: inv.userId,
      scope: t.where(),
      changedFields: Object.keys(updates),
    });
    return NextResponse.json(inv);
  } catch (error) {
    return apiError(error, 'Error updating invoice:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const raw = new URL(req.url).searchParams.get('id');
    if (!raw) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await Invoice.deleteOne(t.where({ _id: recordId(raw) }));
    if (!res.deletedCount) throw new NotFoundError('Invoice not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting invoice:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    const {
      customerId,
      customerName,
      email,
      invoiceDate,
      dueDate,
      lineItems,
      tax,
      paymentTerms,
      notes,
    } = body;

    if (!customerId || !customerName || !lineItems || lineItems.length === 0) {
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

    const invoice = new Invoice({
      ...t.stamp(),
      invoiceNumber: generateInvoiceNumber(),
      customerId,
      customerName,
      email,
      invoiceDate: invoiceDate || new Date(),
      dueDate,
      lineItems,
      subtotal,
      tax: totalTax,
      total,
      amountDue: total,
      currency: 'INR',
      status: 'draft',
      paymentTerms,
      notes,
    });

    await invoice.save();
    await runAccountingWorkflows({ objectType: 'Invoice', event: 'created', record: invoice, userId: invoice.userId, scope: t.where() });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating invoice:');
  }
}
