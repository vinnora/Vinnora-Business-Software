import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import HrmPayroll from '@/models/HrmPayroll';
import { runHrmWorkflows } from '@/lib/hrm-workflows';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period');
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');

    const filter: any = { userId };
    if (period) filter.period = period;
    if (status) filter.status = status;
    if (employeeId) filter.employeeId = employeeId;
    const items = await HrmPayroll.find(filter).sort({ createdAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const body = await req.json();
    if (!body.employeeId || !body.employeeName || !body.period) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    const gross = (Number(body.basicSalary) || 0) + (Number(body.hra) || 0) + (Number(body.conveyance) || 0) + (Number(body.otherAllowances) || 0);
    const deductions = (Number(body.pf) || 0) + (Number(body.esi) || 0) + (Number(body.tds) || 0) + (Number(body.professionalTax) || 0) + (Number(body.otherDeductions) || 0);
    const item = await HrmPayroll.create({ ...body, userId, grossEarnings: gross, totalDeductions: deductions, netPay: gross - deductions });
    await runHrmWorkflows({ objectType: 'PayrollRecord', event: 'created', record: item, userId });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    if (updates.basicSalary !== undefined || updates.hra !== undefined || updates.pf !== undefined) {
      const existing = await HrmPayroll.findById(_id);
      if (existing) {
        const gross = (Number(updates.basicSalary ?? existing.basicSalary) || 0) + (Number(updates.hra ?? existing.hra) || 0) + (Number(updates.conveyance ?? existing.conveyance) || 0) + (Number(updates.otherAllowances ?? existing.otherAllowances) || 0);
        const deductions = (Number(updates.pf ?? existing.pf) || 0) + (Number(updates.esi ?? existing.esi) || 0) + (Number(updates.tds ?? existing.tds) || 0) + (Number(updates.professionalTax ?? existing.professionalTax) || 0) + (Number(updates.otherDeductions ?? existing.otherDeductions) || 0);
        updates.grossEarnings = gross;
        updates.totalDeductions = deductions;
        updates.netPay = gross - deductions;
      }
    }
    const item = await HrmPayroll.findByIdAndUpdate(_id, updates, { new: true });
    if (item) {
      await runHrmWorkflows({ objectType: 'PayrollRecord', event: 'fieldChanged', record: item, userId: item.userId, changedFields: Object.keys(updates) });
    }
    return NextResponse.json(item);
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
    await HrmPayroll.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
