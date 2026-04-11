import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import HrmEmployee from '@/models/HrmEmployee';
import HrmLeaveRequest from '@/models/HrmLeaveRequest';
import HrmJobPosting from '@/models/HrmJobPosting';
import HrmApplicant from '@/models/HrmApplicant';
import HrmPayroll from '@/models/HrmPayroll';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'dashboard-summary': {
        const [totalEmployees, activeEmployees, onLeave, pendingLeaves, openJobs, totalApplicants, payrollAgg] = await Promise.all([
          HrmEmployee.countDocuments({ userId }),
          HrmEmployee.countDocuments({ userId, status: 'Active' }),
          HrmEmployee.countDocuments({ userId, status: 'On Leave' }),
          HrmLeaveRequest.countDocuments({ userId, status: 'Pending' }),
          HrmJobPosting.countDocuments({ userId, status: 'Open' }),
          HrmApplicant.countDocuments({ userId }),
          HrmPayroll.aggregate([{ $match: { userId } }, { $group: { _id: null, totalNetPay: { $sum: '$netPay' }, count: { $sum: 1 } } }]),
        ]);
        const deptAgg = await HrmEmployee.aggregate([{ $match: { userId, status: 'Active' } }, { $group: { _id: '$department', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]);
        const p = payrollAgg[0] || {};
        return NextResponse.json({ totalEmployees, activeEmployees, onLeave, pendingLeaves, openJobs, totalApplicants, totalPayroll: p.totalNetPay || 0, payrollRecords: p.count || 0, departments: deptAgg });
      }
      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Report failed' }, { status: 500 });
  }
}
