import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import GeneralLedger from '@/models/GeneralLedger';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filter: Record<string, unknown> = { status: 'posted' };
    if (accountId) filter.accountId = accountId;

    if (startDate || endDate) {
      const date: Record<string, Date> = {};
      if (startDate) date.$gte = new Date(startDate);
      if (endDate) date.$lte = new Date(endDate);
      filter.date = date;
    }

    const ledgerEntries = await GeneralLedger.find(t.where(filter)).sort({ date: -1 }).limit(100);

    // Calculate running balance
    const withBalance = ledgerEntries.map((entry, index) => {
      const runningBalance = ledgerEntries
        .slice(0, index + 1)
        .reduce((sum, e) => sum + (e.debit - e.credit), 0);

      return {
        ...entry.toObject(),
        runningBalance,
      };
    });

    return NextResponse.json(withBalance);
  } catch (error) {
    return apiError(error, 'Error fetching general ledger:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const entry = await GeneralLedger.findOneAndUpdate(t.where({ _id: recordId(body._id) }), sanitize(body), {
      new: true,
      runValidators: true,
    });
    if (!entry) throw new NotFoundError('Ledger entry not found');
    return NextResponse.json(entry);
  } catch (error) {
    return apiError(error, 'Error updating ledger entry:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const raw = new URL(req.url).searchParams.get('id');
    if (!raw) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await GeneralLedger.deleteOne(t.where({ _id: recordId(raw) }));
    if (!res.deletedCount) throw new NotFoundError('Ledger entry not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting ledger entry:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    const { transactionId, accountId, debit, credit, description, referenceNumber } = body;

    if (!transactionId || !accountId || (debit === undefined && credit === undefined)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const entry = new GeneralLedger({
      ...t.stamp(),
      transactionId,
      accountId,
      debit: debit || 0,
      credit: credit || 0,
      date: new Date(),
      description,
      referenceNumber,
      status: 'posted',
    });

    await entry.save();
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating ledger entry:');
  }
}
