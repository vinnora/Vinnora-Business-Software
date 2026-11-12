'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppHome, HomePanel } from '@/components/platform/AppHome';
import { fmtINR } from './_components/ui';

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
  { href: '/dashboard/marketing/sms', label: 'SMS', desc: 'Text message promotions', icon: '💬' },
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

  const rate = (n?: number) => (summary.totalSent ? (((n || 0) / summary.totalSent) * 100).toFixed(1) : '0');

  return (
    <AppHome
      app="marketing"
      title="Marketing Hub"
      subtitle="Your promotions at a glance."
      action={{ href: '/dashboard/marketing/campaigns', label: '+ New Promotion' }}
      loading={loading}
      metrics={[
        { label: 'Promotions', value: summary.totalCampaigns || 0, hint: 'All time', href: '/dashboard/marketing/campaigns' },
        { label: 'Active', value: summary.activeCampaigns || 0, hint: 'Running now', href: '/dashboard/marketing/campaigns' },
        { label: 'Enquiries', value: summary.totalLeads || 0, hint: 'Marketing enquiries' },
        { label: 'MQLs', value: summary.mqlLeads || 0, hint: 'Qualified' },
        { label: 'Open Rate', value: `${rate(summary.totalOpened)}%`, hint: `${summary.totalOpened || 0} / ${summary.totalSent || 0}` },
        { label: 'Click Rate', value: `${rate(summary.totalClicked)}%`, hint: `${summary.totalClicked || 0} clicks` },
      ]}
      highlights={[
        { label: 'Promotion Revenue', value: fmtINR(summary.totalRevenue), emphasis: true },
        { label: 'Total Budget', value: fmtINR(summary.totalBudget) },
        { label: 'Actual Spend', value: fmtINR(summary.totalSpend) },
      ]}
    >
      <HomePanel title="Active Promotions" link={{ href: '/dashboard/marketing/campaigns', label: 'View all' }}>
        {loading ? (
          <div className="text-sm text-[var(--p-muted)]">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="text-sm text-[var(--p-muted)] text-center py-6">No active promotions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-[var(--p-muted)]">
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
                  <tr key={c._id} className="border-t border-[var(--p-border)] hover:bg-[var(--p-accent-bg)]">
                    <td className="px-3 py-2 font-medium text-[var(--p-text)]">{c.name}</td>
                    <td className="px-3 py-2 text-[var(--p-muted)]">{c.type}</td>
                    <td className="px-3 py-2 text-[var(--p-muted)]">{c.channel?.join(', ') || '—'}</td>
                    <td className="px-3 py-2 text-right">{c.metrics?.sent || 0}</td>
                    <td className="px-3 py-2 text-right">{c.metrics?.opened || 0}</td>
                    <td className="px-3 py-2 text-right">{c.metrics?.clicked || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HomePanel>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="bg-white border border-[var(--p-border)] rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-center"
          >
            <div className="text-2xl mb-2">{l.icon}</div>
            <div className="text-sm font-semibold text-[var(--p-text)]">{l.label}</div>
            <div className="text-[10px] text-[var(--p-muted)] mt-1">{l.desc}</div>
          </Link>
        ))}
      </div>
    </AppHome>
  );
}
