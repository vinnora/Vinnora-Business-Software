import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import { runAccountingWorkflows } from '@/lib/accounting-workflows';
import GeneralLedger from '@/models/GeneralLedger';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const transactions = await Transaction.find(t.where(filter)).sort({ date: -1 }).limit(50);
    return NextResponse.json(transactions);
  } catch (error) {
    return apiError(error, 'Error fetching transactions:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const updates = sanitize(body);
    const txn = await Transaction.findOneAndUpdate(t.where({ _id: recordId(body._id) }), updates, {
      new: true,
      runValidators: true,
    });
    if (!txn) throw new NotFoundError('Transaction not found');
    await runAccountingWorkflows({
      objectType: 'Transaction',
      event: 'fieldChanged',
      record: txn,
      userId: txn.userId,
      scope: t.where(),
      changedFields: Object.keys(updates),
    });
    return NextResponse.json(txn);
  } catch (error) {
    return apiError(error, 'Error updating transaction:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const raw = new URL(req.url).searchParams.get('id');
    if (!raw) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const id = recordId(raw);
    const res = await Transaction.deleteOne(t.where({ _id: id }));
    if (!res.deletedCount) throw new NotFoundError('Transaction not found');
    await GeneralLedger.deleteMany(t.where({ transactionId: id }));
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting transaction:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

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
      ...t.stamp(),
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
        ...t.stamp(),
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
          ...t.stamp(),
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

    await runAccountingWorkflows({ objectType: 'Transaction', event: 'created', record: transaction, userId: transaction.userId, scope: t.where() });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating transaction:');
  }
}
