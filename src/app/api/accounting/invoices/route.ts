import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import { runAccountingWorkflows } from '@/lib/accounting-workflows';

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
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');

    const filter: any = { userId };
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;

    const invoices = await Invoice.find(filter).sort({ invoiceDate: -1 }).limit(50);
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
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
      const inv = await Invoice.findById(_id);
      if (inv) {
        updates.amountPaid = inv.total;
        updates.amountDue = 0;
      }
    }
    const inv = await Invoice.findByIdAndUpdate(_id, updates, { new: true });
    if (inv) {
      await runAccountingWorkflows({ objectType: 'Invoice', event: 'fieldChanged', record: inv, userId: inv.userId, changedFields: Object.keys(updates) });
    }
    return NextResponse.json(inv);
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
    await Invoice.findByIdAndDelete(id);
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
      userId,
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
    await runAccountingWorkflows({ objectType: 'Invoice', event: 'created', record: invoice, userId });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
