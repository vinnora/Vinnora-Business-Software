import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import MktCampaign from '@/models/MktCampaign';
import MktLead from '@/models/MktLead';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'dev-user-id';

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'dashboard-summary': {
        const [totalCampaigns, activeCampaigns, totalLeads, mqlLeads, metricsAgg] =
          await Promise.all([
            MktCampaign.countDocuments({ userId }),
            MktCampaign.countDocuments({ userId, status: 'Active' }),
            MktLead.countDocuments({ userId }),
            MktLead.countDocuments({ userId, stage: 'MQL' }),
            MktCampaign.aggregate([
              { $match: { userId } },
              {
                $group: {
                  _id: null,
                  totalSent: { $sum: '$metrics.sent' },
                  totalOpened: { $sum: '$metrics.opened' },
                  totalClicked: { $sum: '$metrics.clicked' },
                  totalConverted: { $sum: '$metrics.converted' },
                  totalRevenue: { $sum: '$metrics.revenue' },
                  totalBudget: { $sum: '$budget' },
                  totalSpend: { $sum: '$actualSpend' },
                },
              },
            ]),
          ]);

        const m = metricsAgg[0] || {};
        return NextResponse.json({
          totalCampaigns,
          activeCampaigns,
          totalLeads,
          mqlLeads,
          totalSent: m.totalSent || 0,
          totalOpened: m.totalOpened || 0,
          totalClicked: m.totalClicked || 0,
          totalConverted: m.totalConverted || 0,
          totalRevenue: m.totalRevenue || 0,
          totalBudget: m.totalBudget || 0,
          totalSpend: m.totalSpend || 0,
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error generating marketing report:', error);
    return NextResponse.json({ error: 'Report failed' }, { status: 500 });
  }
}
