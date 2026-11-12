import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ChartOfAccounts from '@/models/ChartOfAccounts';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');

    const { searchParams } = new URL(req.url);
    const accountType = searchParams.get('type');

    const filter: Record<string, unknown> = {};
    if (accountType) filter.accountType = accountType;

    const accounts = await ChartOfAccounts.find(t.where(filter)).sort({ accountNumber: 1 });
    return NextResponse.json(accounts);
  } catch (error) {
    return apiError(error, 'Error fetching chart of accounts:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const account = await ChartOfAccounts.findOneAndUpdate(t.where({ _id: recordId(body._id) }), sanitize(body), {
      new: true,
      runValidators: true,
    });
    if (!account) throw new NotFoundError('Account not found');
    return NextResponse.json(account);
  } catch (error) {
    return apiError(error, 'Error updating account:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const raw = new URL(req.url).searchParams.get('id');
    if (!raw) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await ChartOfAccounts.deleteOne(t.where({ _id: recordId(raw) }));
    if (!res.deletedCount) throw new NotFoundError('Account not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting account:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    const {
      accountName,
      accountNumber,
      accountType,
      description,
      parentAccountId,
      isHeader,
    } = body;

    if (!accountName || !accountNumber || !accountType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const account = new ChartOfAccounts({
      ...t.stamp(),
      accountName,
      accountNumber,
      accountType,
      description,
      parentAccountId,
      isHeader: isHeader || false,
      balance: 0,
      currency: 'INR',
      status: 'active',
    });

    await account.save();
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating account:');
  }
}
