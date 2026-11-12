import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Account from '@/models/Account';
import Contact from '@/models/Contact';
import Lead from '@/models/Lead';
import Opportunity from '@/models/Opportunity';
import Activity from '@/models/Activity';
import Case from '@/models/Case';
import { getTenant, apiError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('sales-service');

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
          Account.countDocuments(t.where()),
          Contact.countDocuments(t.where()),
          Lead.countDocuments(t.where({
            status: { $nin: ['Converted', 'Unqualified'] },
          })),
          Opportunity.countDocuments(t.where({
            stage: { $nin: ['Closed Won', 'Closed Lost'] },
          })),
          Case.countDocuments(t.where({
            status: { $nin: ['Resolved', 'Closed'] },
          })),
          Activity.countDocuments(t.where({
            status: { $in: ['Open', 'In Progress'] },
            dueDate: { $lt: new Date() },
          })),
        ]);

        const pipeline = await Opportunity.aggregate([
          {
            $match: t.where({
              stage: { $nin: ['Closed Won', 'Closed Lost'] },
            }),
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
            $match: t.where({
              stage: 'Closed Won',
              closeDate: {
                $gte: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1),
              },
            }),
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
          { $match: t.where() },
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
          { $match: t.where() },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        report = { type: 'lead-funnel', stages: funnel };
        break;
      }

      case 'sales-forecast': {
        const now = new Date();
        const next90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        const opps = await Opportunity.find(t.where({
          closeDate: { $gte: now, $lte: next90 },
          stage: { $nin: ['Closed Won', 'Closed Lost'] },
        }));

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
          { $match: t.where({ status: { $nin: ['Resolved', 'Closed'] } }) },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]);
        const byStatus = await Case.aggregate([
          { $match: t.where() },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const slaBreaches = await Case.countDocuments(t.where({
          slaDueAt: { $lt: new Date() },
          status: { $nin: ['Resolved', 'Closed'] },
        }));
        report = { type: 'case-summary', byPriority, byStatus, slaBreaches };
        break;
      }

      case 'activity-summary': {
        const byType = await Activity.aggregate([
          { $match: t.where() },
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
    return apiError(error, 'Error generating sales-service report:');
  }
}
