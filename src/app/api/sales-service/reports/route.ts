import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Account from '@/models/Account';
import Contact from '@/models/Contact';
import Lead from '@/models/Lead';
import Opportunity from '@/models/Opportunity';
import Activity from '@/models/Activity';
import Case from '@/models/Case';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'dashboard-summary';

    let report: any = {};

    switch (type) {
      case 'dashboard-summary': {
        const [
          totalAccounts,
          totalContacts,
          openLeads,
          openOpportunities,
          openCases,
          overdueActivities,
        ] = await Promise.all([
          Account.countDocuments({ userId }),
          Contact.countDocuments({ userId }),
          Lead.countDocuments({
            userId,
            status: { $nin: ['Converted', 'Unqualified'] },
          }),
          Opportunity.countDocuments({
            userId,
            stage: { $nin: ['Closed Won', 'Closed Lost'] },
          }),
          Case.countDocuments({
            userId,
            status: { $nin: ['Resolved', 'Closed'] },
          }),
          Activity.countDocuments({
            userId,
            status: { $in: ['Open', 'In Progress'] },
            dueDate: { $lt: new Date() },
          }),
        ]);

        const pipeline = await Opportunity.aggregate([
          {
            $match: {
              userId,
              stage: { $nin: ['Closed Won', 'Closed Lost'] },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
              weighted: {
                $sum: { $multiply: ['$amount', { $divide: ['$probability', 100] }] },
              },
            },
          },
        ]);

        const wonThisQuarter = await Opportunity.aggregate([
          {
            $match: {
              userId,
              stage: 'Closed Won',
              closeDate: {
                $gte: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1),
              },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        report = {
          type: 'dashboard-summary',
          totalAccounts,
          totalContacts,
          openLeads,
          openOpportunities,
          openCases,
          overdueActivities,
          pipelineValue: pipeline[0]?.total || 0,
          weightedPipeline: pipeline[0]?.weighted || 0,
          wonThisQuarter: wonThisQuarter[0]?.total || 0,
        };
        break;
      }

      case 'pipeline-by-stage': {
        const pipeline = await Opportunity.aggregate([
          { $match: { userId } },
          {
            $group: {
              _id: '$stage',
              count: { $sum: 1 },
              total: { $sum: '$amount' },
            },
          },
        ]);
        report = { type: 'pipeline-by-stage', stages: pipeline };
        break;
      }

      case 'lead-funnel': {
        const funnel = await Lead.aggregate([
          { $match: { userId } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        report = { type: 'lead-funnel', stages: funnel };
        break;
      }

      case 'sales-forecast': {
        const now = new Date();
        const next90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        const opps = await Opportunity.find({
          userId,
          closeDate: { $gte: now, $lte: next90 },
          stage: { $nin: ['Closed Won', 'Closed Lost'] },
        });

        const forecast = opps.reduce(
          (acc: any, o: any) => {
            acc.total += o.amount;
            acc.weighted += o.amount * (o.probability / 100);
            acc.commit += o.probability >= 70 ? o.amount : 0;
            acc.bestCase += o.probability >= 30 ? o.amount : 0;
            return acc;
          },
          { total: 0, weighted: 0, commit: 0, bestCase: 0 }
        );

        report = { type: 'sales-forecast', period: '90 days', count: opps.length, ...forecast };
        break;
      }

      case 'case-summary': {
        const byPriority = await Case.aggregate([
          { $match: { userId, status: { $nin: ['Resolved', 'Closed'] } } },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]);
        const byStatus = await Case.aggregate([
          { $match: { userId } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const slaBreaches = await Case.countDocuments({
          userId,
          slaDueAt: { $lt: new Date() },
          status: { $nin: ['Resolved', 'Closed'] },
        });
        report = { type: 'case-summary', byPriority, byStatus, slaBreaches };
        break;
      }

      case 'activity-summary': {
        const byType = await Activity.aggregate([
          { $match: { userId } },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]);
        report = { type: 'activity-summary', byType };
        break;
      }

      default:
        report = { type: 'unknown' };
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating sales-service report:', error);
    return NextResponse.json({ type: 'error', message: 'Report generation failed' }, { status: 200 });
  }
}
