import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MktCampaign from '@/models/MktCampaign';
import MktLead from '@/models/MktLead';
import { getTenant, apiError } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const t = await getTenant('marketing');

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'dashboard-summary': {
        const [totalCampaigns, activeCampaigns, totalLeads, mqlLeads, metricsAgg] =
          await Promise.all([
            MktCampaign.countDocuments(t.where()),
            MktCampaign.countDocuments(t.where({ status: 'Active' })),
            MktLead.countDocuments(t.where()),
            MktLead.countDocuments(t.where({ stage: 'MQL' })),
            MktCampaign.aggregate([
              { $match: t.where() },
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
    return apiError(error, 'Error generating marketing report:');
  }
}
