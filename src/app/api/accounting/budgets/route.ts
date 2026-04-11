import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Budget from '@/models/Budget';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const fiscalYear = searchParams.get('fiscalYear');
    const status = searchParams.get('status');

    const filter: any = { userId };
    if (fiscalYear) filter.fiscalYear = fiscalYear;
    if (status) filter.status = status;

    const budgets = await Budget.find(filter).sort({ createdAt: -1 }).limit(50);
    return NextResponse.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    if (updates.budgetItems) {
      updates.totalBudget = updates.budgetItems.reduce(
        (s: number, b: any) => s + (b.budgetAmount || 0),
        0
      );
      updates.totalActual = updates.budgetItems.reduce(
        (s: number, b: any) => s + (b.actualAmount || 0),
        0
      );
    }
    const budget = await Budget.findByIdAndUpdate(_id, updates, { new: true });
    return NextResponse.json(budget);
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
    await Budget.findByIdAndDelete(id);
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
    const { budgetName, fiscalYear, department, budgetItems, notes } = body;

    if (!budgetName || !fiscalYear || !budgetItems) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const totalBudget = budgetItems.reduce((sum: number, item: any) => sum + item.budgetAmount, 0);

    const budget = new Budget({
      userId,
      budgetName,
      fiscalYear,
      department,
      budgetItems,
      totalBudget,
      totalActual: 0,
      status: 'draft',
      currency: 'INR',
      createdBy: session?.user?.name || userId,
      notes,
    });

    await budget.save();
    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });
  }
}
