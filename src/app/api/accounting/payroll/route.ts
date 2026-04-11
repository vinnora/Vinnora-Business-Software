import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import PayrollEntry from '@/models/PayrollEntry';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const payrollPeriod = searchParams.get('payrollPeriod');
    const status = searchParams.get('status');

    const filter: any = { userId };
    if (employeeId) filter.employeeId = employeeId;
    if (payrollPeriod) filter.payrollPeriod = payrollPeriod;
    if (status) filter.status = status;

    const entries = await PayrollEntry.find(filter).sort({ paymentDate: -1 }).limit(50);
    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching payroll:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;
    if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const entry = await PayrollEntry.findByIdAndUpdate(_id, updates, { new: true });
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
    await PayrollEntry.findByIdAndDelete(id);
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
      employeeId,
      employeeName,
      payrollPeriod,
      paymentDate,
      baseSalary,
      hra,
      da,
      allowances,
      deductions,
      incomeTax,
      providentFund,
      panNumber,
      aadharNumber,
      bankName,
      bankAccount,
      notes,
    } = body;

    if (!employeeId || !employeeName || !payrollPeriod || !paymentDate || !baseSalary) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate gross salary
    const allowancesSum = Object.values(allowances || {}).reduce((sum: any, val: any) => sum + val, 0);
    const hraAmount = hra || 0;
    const daAmount = da || 0;
    const grossSalary = baseSalary + hraAmount + daAmount + allowancesSum;

    // Calculate net salary
    const deductionsSum = Object.values(deductions || {}).reduce((sum: any, val: any) => sum + val, 0);
    const taxAmount = incomeTax || 0;
    const pfAmount = providentFund || 0;
    const totalDeductions = taxAmount + pfAmount + deductionsSum;
    const netSalary = grossSalary - totalDeductions;

    const payroll = new PayrollEntry({
      userId,
      employeeId,
      employeeName,
      payrollPeriod,
      paymentDate,
      baseSalary,
      hra: hraAmount,
      da: daAmount,
      allowances: allowances || {},
      deductions: deductions || {},
      grossSalary,
      incomeTax: taxAmount,
      providentFund: pfAmount,
      netSalary,
      currency: 'INR',
      status: 'draft',
      panNumber,
      aadharNumber,
      bankName,
      bankAccount,
      notes,
    });

    await payroll.save();
    return NextResponse.json(payroll, { status: 201 });
  } catch (error) {
    console.error('Error creating payroll:', error);
    return NextResponse.json({ error: 'Failed to create payroll entry' }, { status: 500 });
  }
}
