import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HrmPayroll from '@/models/HrmPayroll';
import { runHrmWorkflows } from '@/lib/hrm-workflows';
import { getTenant, sanitize, recordId, apiError, NotFoundError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period');
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');

    const filter: Record<string, unknown> = {};
    if (period) filter.period = period;
    if (status) filter.status = status;
    if (employeeId) filter.employeeId = employeeId;
    const items = await HrmPayroll.find(t.where(filter)).sort({ createdAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, 'Error fetching payroll:');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body.employeeId || !body.employeeName || !body.period) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    const gross = (Number(body.basicSalary) || 0) + (Number(body.hra) || 0) + (Number(body.conveyance) || 0) + (Number(body.otherAllowances) || 0);
    const deductions = (Number(body.pf) || 0) + (Number(body.esi) || 0) + (Number(body.tds) || 0) + (Number(body.professionalTax) || 0) + (Number(body.otherDeductions) || 0);
    const stamp = t.stamp();
    const item = await HrmPayroll.create({ ...sanitize(body), ...stamp, grossEarnings: gross, totalDeductions: deductions, netPay: gross - deductions });
    await runHrmWorkflows({ objectType: 'PayrollRecord', event: 'created', record: item, userId: stamp.userId, scope: t.where() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error, 'Error creating payroll record:');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const body = await req.json();
    if (!body._id) return NextResponse.json({ error: '_id required' }, { status: 400 });
    const id = recordId(body._id);
    const updates: Record<string, unknown> = sanitize(body);
    if (updates.basicSalary !== undefined || updates.hra !== undefined || updates.pf !== undefined) {
      const existing = await HrmPayroll.findOne(t.where({ _id: id }));
      if (!existing) throw new NotFoundError('Payroll record not found');
      const gross = (Number(updates.basicSalary ?? existing.basicSalary) || 0) + (Number(updates.hra ?? existing.hra) || 0) + (Number(updates.conveyance ?? existing.conveyance) || 0) + (Number(updates.otherAllowances ?? existing.otherAllowances) || 0);
      const deductions = (Number(updates.pf ?? existing.pf) || 0) + (Number(updates.esi ?? existing.esi) || 0) + (Number(updates.tds ?? existing.tds) || 0) + (Number(updates.professionalTax ?? existing.professionalTax) || 0) + (Number(updates.otherDeductions ?? existing.otherDeductions) || 0);
      updates.grossEarnings = gross;
      updates.totalDeductions = deductions;
      updates.netPay = gross - deductions;
    }
    const item = await HrmPayroll.findOneAndUpdate(t.where({ _id: id }), updates, { new: true, runValidators: true });
    if (!item) throw new NotFoundError('Payroll record not found');
    await runHrmWorkflows({ objectType: 'PayrollRecord', event: 'fieldChanged', record: item, userId: item.userId, scope: t.where(), changedFields: Object.keys(updates) });
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, 'Error updating payroll record:');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    t.requireWrite();
    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get('id');
    if (!rawId) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await HrmPayroll.deleteOne(t.where({ _id: recordId(rawId) }));
    if (!res.deletedCount) throw new NotFoundError('Payroll record not found');
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Error deleting payroll record:');
  }
}
