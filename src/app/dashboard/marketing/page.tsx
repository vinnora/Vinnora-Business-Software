'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tile, fmtINR } from './_components/ui';

type Summary = {
  totalCampaigns?: number;
  activeCampaigns?: number;
  totalLeads?: number;
  mqlLeads?: number;
  totalSent?: number;
  totalOpened?: number;
  totalClicked?: number;
  totalConverted?: number;
  totalRevenue?: number;
  totalBudget?: number;
  totalSpend?: number;
};

type Campaign = {
  _id: string;
  name: string;
  type: string;
  status: string;
  channel: string[];
  startDate?: string;
  metrics: { sent: number; opened: number; clicked: number };
};

const QUICK_LINKS = [
  { href: '/dashboard/marketing/email', label: 'Email', desc: 'Draft & send emails', icon: '✉' },
  { href: '/dashboard/marketing/sms', label: 'SMS', desc: 'Text message campaigns', icon: '💬' },
  { href: '/dashboard/marketing/social', label: 'Social', desc: 'Schedule & monitor', icon: '📢' },
  { href: '/dashboard/marketing/events', label: 'Events', desc: 'Publish & sell tickets', icon: '🎟' },
  { href: '/dashboard/marketing/surveys', label: 'Surveys', desc: 'Collect feedback', icon: '📋' },
  { href: '/dashboard/marketing/automation', label: 'Automation', desc: 'Nurture workflows', icon: '⚡' },
];

export default function MarketingHome() {
  const [summary, setSummary] = useState<Summary>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/marketing/reports?type=dashboard-summary').then((r) => r.json()),
      fetch('/api/marketing/campaigns?status=Active').then((r) => r.json()),
    ])
      .then(([s, c]) => {
        setSummary(s || {});
        setCampaigns(Array.isArray(c) ? c.slice(0, 5) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openRate = summary.totalSent
    ? ((summary.totalOpened || 0) / summary.totalSent * 100).toFixed(1)
    : '0';
  const clickRate = summary.totalSent
    ? ((summary.totalClicked || 0) / summary.totalSent * 100).toFixed(1)
    : '0';

  return (
    <div className="p-6">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#94A8B8]">Marketing</div>
          <h1 className="text-2xl font-semibold text-[#3D5266]">Marketing Hub</h1>
          <p className="text-sm text-[#5A7A8C] mt-1">Your campaigns at a glance.</p>
        </div>
        <Link
          href="/dashboard/marketing/campaigns"
          className="px-4 py-2 bg-gradient-to-r from-[#5A7A8C] to-[#94A8B8] text-white text-sm rounded hover:from-[#3D5266] hover:to-[#5A7A8C] shadow-sm shadow-[#5A7A8C]/30"
        >
          + New Campaign
        </Link>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Tile label="Campaigns" value={summary.totalCampaigns || 0} tone="storm" hint="All time" />
        <Tile label="Active" value={summary.activeCampaigns || 0} tone="lavender" hint="Running now" />
        <Tile label="Leads" value={summary.totalLeads || 0} tone="pollen" hint="Marketing leads" />
        <Tile label="MQLs" value={summary.mqlLeads || 0} tone="twilight" hint="Qualified" />
        <Tile label="Open Rate" value={`${openRate}%`} tone="storm" hint={`${summary.totalOpened || 0} / ${summary.totalSent || 0}`} />
        <Tile label="Click Rate" value={`${clickRate}%`} tone="lavender" hint={`${summary.totalClicked || 0} clicks`} />
      </div>

      {/* Revenue & spend row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg p-5 border bg-gradient-to-br from-[#3D5266] to-[#5A7A8C] text-white border-transparent">
          <div className="text-xs uppercase tracking-wide text-white/70">Campaign Revenue</div>
          <div className="text-2xl font-semibold mt-1">{fmtINR(summary.totalRevenue)}</div>
        </div>
        <div className="rounded-lg p-5 border bg-white border-[#D6E5EC]">
          <div className="text-xs uppercase tracking-wide text-[#94A8B8]">Total Budget</div>
          <div className="text-2xl font-semibold text-[#3D5266] mt-1">{fmtINR(summary.totalBudget)}</div>
        </div>
        <div className="rounded-lg p-5 border bg-white border-[#D6E5EC]">
          <div className="text-xs uppercase tracking-wide text-[#94A8B8]">Actual Spend</div>
          <div className="text-2xl font-semibold text-[#3D5266] mt-1">{fmtINR(summary.totalSpend)}</div>
        </div>
      </div>

      {/* Active campaigns */}
      <div className="bg-white border border-[#D6E5EC] rounded-lg p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#3D5266]">Active Campaigns</h2>
          <Link href="/dashboard/marketing/campaigns" className="text-xs text-[#5A7A8C] hover:underline">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="text-sm text-[#94A8B8]">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="text-sm text-[#94A8B8] text-center py-6">No active campaigns yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-[#94A8B8]">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Channel</th>
                <th className="text-right px-3 py-2">Sent</th>
                <th className="text-right px-3 py-2">Opened</th>
                <th className="text-right px-3 py-2">Clicked</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c._id} className="border-t border-[#E8F1F5] hover:bg-[#F4F9FB]">
                  <td className="px-3 py-2 font-medium text-[#3D5266]">{c.name}</td>
                  <td className="px-3 py-2 text-[#5A7A8C]">{c.type}</td>
                  <td className="px-3 py-2 text-[#5A7A8C]">{c.channel?.join(', ') || '—'}</td>
                  <td className="px-3 py-2 text-right">{c.metrics?.sent || 0}</td>
                  <td className="px-3 py-2 text-right">{c.metrics?.opened || 0}</td>
                  <td className="px-3 py-2 text-right">{c.metrics?.clicked || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="bg-white border border-[#D6E5EC] rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-center"
          >
            <div className="text-2xl mb-2">{l.icon}</div>
            <div className="text-sm font-semibold text-[#3D5266]">{l.label}</div>
            <div className="text-[10px] text-[#94A8B8] mt-1">{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
