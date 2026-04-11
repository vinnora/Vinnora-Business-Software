import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ChartOfAccounts from '@/models/ChartOfAccounts';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const accountType = searchParams.get('type');

    const filter: any = { userId };
    if (accountType) filter.accountType = accountType;

    const accounts = await ChartOfAccounts.find(filter).sort({ accountNumber: 1 });
    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const account = await ChartOfAccounts.findByIdAndUpdate(_id, updates, { new: true });
    return NextResponse.json(account);
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
    await ChartOfAccounts.findByIdAndDelete(id);
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
      userId,
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
    console.error('Error creating COA:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
