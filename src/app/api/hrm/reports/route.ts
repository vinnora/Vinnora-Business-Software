import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HrmEmployee from '@/models/HrmEmployee';
import HrmLeaveRequest from '@/models/HrmLeaveRequest';
import HrmJobPosting from '@/models/HrmJobPosting';
import HrmApplicant from '@/models/HrmApplicant';
import HrmPayroll from '@/models/HrmPayroll';
import { getTenant, apiError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('hrm');
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'dashboard-summary': {
        const [totalEmployees, activeEmployees, onLeave, pendingLeaves, openJobs, totalApplicants, payrollAgg] = await Promise.all([
          HrmEmployee.countDocuments(t.where()),
          HrmEmployee.countDocuments(t.where({ status: 'Active' })),
          HrmEmployee.countDocuments(t.where({ status: 'On Leave' })),
          HrmLeaveRequest.countDocuments(t.where({ status: 'Pending' })),
          HrmJobPosting.countDocuments(t.where({ status: 'Open' })),
          HrmApplicant.countDocuments(t.where()),
          HrmPayroll.aggregate([{ $match: t.where() }, { $group: { _id: null, totalNetPay: { $sum: '$netPay' }, count: { $sum: 1 } } }]),
        ]);
        const deptAgg = await HrmEmployee.aggregate([{ $match: t.where({ status: 'Active' }) }, { $group: { _id: '$department', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]);
        const p = payrollAgg[0] || {};
        return NextResponse.json({ totalEmployees, activeEmployees, onLeave, pendingLeaves, openJobs, totalApplicants, totalPayroll: p.totalNetPay || 0, payrollRecords: p.count || 0, departments: deptAgg });
      }
      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
    }
  } catch (error) {
    return apiError(error, 'Error building HR report:');
  }
}
