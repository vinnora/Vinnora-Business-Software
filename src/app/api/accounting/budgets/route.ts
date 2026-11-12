import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Budget from '@/models/Budget';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');

    const { searchParams } = new URL(req.url);
    const fiscalYear = searchParams.get('fiscalYear');
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (fiscalYear) filter.fiscalYear = fiscalYear;
    if (status) filter.status = status;

    const budgets = await Budget.find(t.where(filter)).sort({ createdAt: -1 }).limit(50);
    return NextResponse.json(budgets);
  } catch (error) {
    return apiError(error, 'Error fetching budgets:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const updates: Record<string, any> = sanitize(body);
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
    const budget = await Budget.findOneAndUpdate(t.where({ _id: recordId(body._id) }), updates, {
      new: true,
      runValidators: true,
    });
    if (!budget) throw new NotFoundError('Budget not found');
    return NextResponse.json(budget);
  } catch (error) {
    return apiError(error, 'Error updating budget:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const raw = new URL(req.url).searchParams.get('id');
    if (!raw) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await Budget.deleteOne(t.where({ _id: recordId(raw) }));
    if (!res.deletedCount) throw new NotFoundError('Budget not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting budget:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    const { budgetName, fiscalYear, department, budgetItems, notes } = body;

    if (!budgetName || !fiscalYear || !budgetItems) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const totalBudget = budgetItems.reduce((sum: number, item: any) => sum + item.budgetAmount, 0);
    const stamp = t.stamp();

    const budget = new Budget({
      ...stamp,
      budgetName,
      fiscalYear,
      department,
      budgetItems,
      totalBudget,
      totalActual: 0,
      status: 'draft',
      currency: 'INR',
      createdBy: t.ctx.user?.name || stamp.userId,
      notes,
    });

    await budget.save();
    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating budget:');
  }
}
