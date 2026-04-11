'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Summary = {
  totalAccounts?: number;
  totalContacts?: number;
  openLeads?: number;
  openOpportunities?: number;
  openCases?: number;
  overdueActivities?: number;
  pipelineValue?: number;
  weightedPipeline?: number;
  wonThisQuarter?: number;
};

type StageRow = { _id: string; count: number; total: number };

const fmtINR = (n = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function SalesServiceHome() {
  const [summary, setSummary] = useState<Summary>({});
  const [pipeline, setPipeline] = useState<StageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/sales-service/reports?type=dashboard-summary').then((r) => r.json()),
      fetch('/api/sales-service/reports?type=pipeline-by-stage').then((r) => r.json()),
    ])
      .then(([s, p]) => {
        setSummary(s);
        setPipeline(p.stages || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxStage = Math.max(1, ...pipeline.map((s) => s.total));

  return (
    <div className="p-6">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Sales &amp; Service</div>
          <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Your CRM at a glance.</p>
        </div>
        <Link
          href="/dashboard/sales-service/leads"
          className="px-4 py-2 bg-[#0176d3] text-white text-sm rounded hover:bg-[#014486]"
        >
          + New Lead
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KpiCard label="Accounts" value={summary.totalAccounts || 0} href="/dashboard/sales-service/accounts" tone="blue" />
        <KpiCard label="Contacts" value={summary.totalContacts || 0} href="/dashboard/sales-service/contacts" tone="indigo" />
        <KpiCard label="Open Leads" value={summary.openLeads || 0} href="/dashboard/sales-service/leads" tone="amber" />
        <KpiCard label="Open Opps" value={summary.openOpportunities || 0} href="/dashboard/sales-service/opportunities" tone="green" />
        <KpiCard label="Open Cases" value={summary.openCases || 0} href="/dashboard/sales-service/cases" tone="red" />
        <KpiCard label="Overdue" value={summary.overdueActivities || 0} href="/dashboard/sales-service/activities" tone="orange" />
      </div>

      {/* Forecast row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ForecastCard label="Pipeline Value" value={fmtINR(summary.pipelineValue)} hint="All open opportunities" />
        <ForecastCard label="Weighted Forecast" value={fmtINR(summary.weightedPipeline)} hint="By stage probability" />
        <ForecastCard label="Closed Won (QTD)" value={fmtINR(summary.wonThisQuarter)} hint="Quarter to date" highlight />
      </div>

      {/* Pipeline by stage */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Pipeline by Stage</h2>
          <Link href="/dashboard/sales-service/opportunities" className="text-xs text-[#0176d3] hover:underline">
            View pipeline →
          </Link>
        </div>
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : pipeline.length === 0 ? (
          <div className="text-sm text-gray-500">No opportunities yet.</div>
        ) : (
          <div className="space-y-2">
            {pipeline.map((s) => (
              <div key={s._id} className="flex items-center gap-3">
                <div className="w-36 text-sm text-gray-700 truncate">{s._id}</div>
                <div className="flex-1 bg-gray-100 rounded h-7 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0176d3] to-[#1ab9ff] rounded"
                    style={{ width: `${(s.total / maxStage) * 100}%` }}
                  />
                  <div className="relative px-2 h-full flex items-center text-xs text-gray-700">
                    {s.count} • {fmtINR(s.total)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone: 'blue' | 'indigo' | 'amber' | 'green' | 'red' | 'orange';
}) {
  const tones: Record<string, string> = {
    blue: 'from-[#0176d3] to-[#1ab9ff]',
    indigo: 'from-[#3b0a85] to-[#7b3fe4]',
    amber: 'from-[#b65a00] to-[#fa9b3a]',
    green: 'from-[#0a6f55] to-[#2dc28a]',
    red: 'from-[#a20f0f] to-[#f64e4e]',
    orange: 'from-[#ad3500] to-[#ff6f3c]',
  };
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition block"
    >
      <div className={`h-1 -mx-4 -mt-4 mb-3 rounded-t-lg bg-gradient-to-r ${tones[tone]}`} />
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-3xl font-semibold text-gray-900 mt-1">{value}</div>
    </Link>
  );
}

function ForecastCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-5 border ${
        highlight
          ? 'bg-gradient-to-br from-[#032d60] to-[#0176d3] text-white border-transparent'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className={`text-xs uppercase tracking-wide ${highlight ? 'text-white/70' : 'text-gray-500'}`}>
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      <div className={`text-xs mt-1 ${highlight ? 'text-white/70' : 'text-gray-500'}`}>{hint}</div>
    </div>
  );
}
