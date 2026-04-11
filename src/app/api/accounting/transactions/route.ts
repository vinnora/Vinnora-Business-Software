import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import { runAccountingWorkflows } from '@/lib/accounting-workflows';
import GeneralLedger from '@/models/GeneralLedger';
import ChartOfAccounts from '@/models/ChartOfAccounts';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const filter: any = { userId };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const transactions = await Transaction.find(filter).sort({ date: -1 }).limit(50);
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const t = await Transaction.findByIdAndUpdate(_id, updates, { new: true });
    if (t) {
      await runAccountingWorkflows({ objectType: 'Transaction', event: 'fieldChanged', record: t, userId: t.userId, changedFields: Object.keys(updates) });
    }
    return NextResponse.json(t);
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
    await Transaction.findByIdAndDelete(id);
    await GeneralLedger.deleteMany({ transactionId: id });
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
      transactionType,
      description,
      amount,
      category,
      payee,
      accountId,
      counterAccountId,
      referenceNumber,
      notes,
    } = body;

    if (!transactionType || !description || !amount || !category || !accountId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create transaction
    const transaction = new Transaction({
      userId,
      transactionType,
      description,
      amount,
      date: new Date(),
      category,
      payee,
      accountId,
      counterAccountId,
      referenceNumber,
      notes,
      status: 'posted',
    });

    await transaction.save();

    // Create general ledger entries
    if (transaction.transactionType === 'expense' || transaction.transactionType === 'income') {
      // Debit account
      const debitEntry = new GeneralLedger({
        userId,
        transactionId: transaction._id.toString(),
        accountId,
        debit: transaction.transactionType === 'expense' ? amount : 0,
        credit: transaction.transactionType === 'income' ? amount : 0,
        date: new Date(),
        description,
        referenceNumber,
        status: 'posted',
      });

      await debitEntry.save();

      // Update account balance
      if (counterAccountId) {
        const creditEntry = new GeneralLedger({
          userId,
          transactionId: transaction._id.toString(),
          accountId: counterAccountId,
          debit: transaction.transactionType === 'income' ? amount : 0,
          credit: transaction.transactionType === 'expense' ? amount : 0,
          date: new Date(),
          description: `${description} - Counter Entry`,
          referenceNumber,
          status: 'posted',
        });

        await creditEntry.save();
      }
    }

    await runAccountingWorkflows({ objectType: 'Transaction', event: 'created', record: transaction, userId });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
