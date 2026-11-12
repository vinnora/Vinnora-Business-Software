import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PayrollEntry from '@/models/PayrollEntry';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const payrollPeriod = searchParams.get('payrollPeriod');
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (employeeId) filter.employeeId = employeeId;
    if (payrollPeriod) filter.payrollPeriod = payrollPeriod;
    if (status) filter.status = status;

    const entries = await PayrollEntry.find(t.where(filter)).sort({ paymentDate: -1 }).limit(50);
    return NextResponse.json(entries);
  } catch (error) {
    return apiError(error, 'Error fetching payroll:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const entry = await PayrollEntry.findOneAndUpdate(t.where({ _id: recordId(body._id) }), sanitize(body), {
      new: true,
      runValidators: true,
    });
    if (!entry) throw new NotFoundError('Payroll entry not found');
    return NextResponse.json(entry);
  } catch (error) {
    return apiError(error, 'Error updating payroll:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

    const raw = new URL(req.url).searchParams.get('id');
    if (!raw) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await PayrollEntry.deleteOne(t.where({ _id: recordId(raw) }));
    if (!res.deletedCount) throw new NotFoundError('Payroll entry not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting payroll:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('accounting');
    t.requireWrite();

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
      ...t.stamp(),
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
    return apiError(error, 'Error creating payroll:');
  }
}
