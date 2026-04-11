import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import GeneralLedger from '@/models/GeneralLedger';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filter: any = { userId, status: 'posted' };
    if (accountId) filter.accountId = accountId;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const ledgerEntries = await GeneralLedger.find(filter).sort({ date: -1 }).limit(100);

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
    console.error('Error fetching general ledger:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const entry = await GeneralLedger.findByIdAndUpdate(_id, updates, { new: true });
    return NextResponse.json(entry);
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
    await GeneralLedger.findByIdAndDelete(id);
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
    const { transactionId, accountId, debit, credit, description, referenceNumber } = body;

    if (!transactionId || !accountId || (debit === undefined && credit === undefined)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const entry = new GeneralLedger({
      userId,
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
    console.error('Error creating ledger entry:', error);
    return NextResponse.json({ error: 'Failed to create ledger entry' }, { status: 500 });
  }
}
