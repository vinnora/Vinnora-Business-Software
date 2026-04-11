'use client';

import { useEffect, useState } from 'react';
import { Tile, fmtINR } from '../_components/ui';

type Summary = {
  totalCampaigns?: number; activeCampaigns?: number; totalLeads?: number; mqlLeads?: number;
  totalSent?: number; totalOpened?: number; totalClicked?: number; totalConverted?: number;
  totalRevenue?: number; totalBudget?: number; totalSpend?: number;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Summary>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/marketing/reports?type=dashboard-summary')
      .then(r => r.json())
      .then(d => setData(d || {}))
      .finally(() => setLoading(false));
  }, []);

  const openRate = data.totalSent ? ((data.totalOpened || 0) / data.totalSent * 100).toFixed(1) : '0';
  const clickRate = data.totalSent ? ((data.totalClicked || 0) / data.totalSent * 100).toFixed(1) : '0';
  const convRate = data.totalSent ? ((data.totalConverted || 0) / data.totalSent * 100).toFixed(2) : '0';
  const roi = data.totalSpend ? (((data.totalRevenue || 0) - data.totalSpend) / data.totalSpend * 100).toFixed(1) : '0';

  if (loading) return <div className="p-6 text-[#94A8B8]">Loading analytics…</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wide text-[#94A8B8]">Marketing</div>
        <h1 className="text-2xl font-semibold text-[#3D5266]">Analytics</h1>
        <p className="text-sm text-[#5A7A8C] mt-1">Campaign performance and funnel metrics.</p>
      </div>

      {/* Campaign overview */}
      <h2 className="text-sm font-semibold text-[#3D5266] mb-3 uppercase tracking-wide">Campaign Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Tile label="Total Campaigns" value={data.totalCampaigns || 0} tone="storm" />
        <Tile label="Active" value={data.activeCampaigns || 0} tone="lavender" />
        <Tile label="Total Budget" value={fmtINR(data.totalBudget)} tone="pollen" />
        <Tile label="Total Spend" value={fmtINR(data.totalSpend)} tone="twilight" />
      </div>

      {/* Email performance */}
      <h2 className="text-sm font-semibold text-[#3D5266] mb-3 uppercase tracking-wide">Email Performance</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Tile label="Emails Sent" value={(data.totalSent || 0).toLocaleString()} tone="storm" />
        <Tile label="Open Rate" value={`${openRate}%`} tone="lavender" hint={`${data.totalOpened || 0} opened`} />
        <Tile label="Click Rate" value={`${clickRate}%`} tone="pollen" hint={`${data.totalClicked || 0} clicked`} />
        <Tile label="Conversion Rate" value={`${convRate}%`} tone="twilight" hint={`${data.totalConverted || 0} converted`} />
      </div>

      {/* Lead funnel */}
      <h2 className="text-sm font-semibold text-[#3D5266] mb-3 uppercase tracking-wide">Lead Funnel</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Tile label="Total Leads" value={data.totalLeads || 0} tone="storm" />
        <Tile label="MQLs" value={data.mqlLeads || 0} tone="lavender" hint="Marketing Qualified" />
        <Tile label="Conversion" value={data.totalLeads ? `${((data.mqlLeads || 0) / data.totalLeads * 100).toFixed(1)}%` : '0%'} tone="pollen" hint="Lead → MQL" />
      </div>

      {/* ROI */}
      <h2 className="text-sm font-semibold text-[#3D5266] mb-3 uppercase tracking-wide">Return on Investment</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg p-5 border bg-gradient-to-br from-[#3D5266] to-[#5A7A8C] text-white border-transparent">
          <div className="text-xs uppercase tracking-wide text-white/70">Revenue</div>
          <div className="text-2xl font-semibold mt-1">{fmtINR(data.totalRevenue)}</div>
        </div>
        <div className="rounded-lg p-5 border bg-white border-[#D6E5EC]">
          <div className="text-xs uppercase tracking-wide text-[#94A8B8]">Spend</div>
          <div className="text-2xl font-semibold text-[#3D5266] mt-1">{fmtINR(data.totalSpend)}</div>
        </div>
        <div className="rounded-lg p-5 border bg-white border-[#D6E5EC]">
          <div className="text-xs uppercase tracking-wide text-[#94A8B8]">ROI</div>
          <div className={`text-2xl font-semibold mt-1 ${Number(roi) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{roi}%</div>
        </div>
      </div>
    </div>
  );
}
