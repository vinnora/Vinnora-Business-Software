'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fmtINR } from './_components/ui';

type Summary = {
  totalInvoices?: number;
  totalBills?: number;
  totalTransactions?: number;
  totalAssets?: number;
};

export default function AccountingHome() {
  const [summary, setSummary] = useState<Summary>({});
  const [income, setIncome] = useState<any>({});
  const [arAging, setArAging] = useState<any>({});
  const [apAging, setApAging] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/accounting/reports?type=dashboard-summary').then((r) => r.json()),
      fetch('/api/accounting/reports?type=income-statement').then((r) => r.json()),
      fetch('/api/accounting/reports?type=receivables').then((r) => r.json()),
      fetch('/api/accounting/reports?type=payables').then((r) => r.json()),
    ])
      .then(([s, i, ar, ap]) => {
        setSummary(s || {});
        setIncome(i || {});
        setArAging(ar || {});
        setApAging(ap || {});
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Accounting</div>
          <h1 className="text-2xl font-semibold text-gray-900">Financial Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Your books at a glance.</p>
        </div>
        <Link
          href="/dashboard/accounting/transactions"
          className="px-4 py-2 bg-emerald-700 text-white text-sm rounded hover:bg-emerald-800"
        >
          + New Transaction
        </Link>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Invoices" value={summary.totalInvoices || 0} hint="Accounts Receivable" href="/dashboard/accounting/invoices" tone="emerald" />
        <KpiCard label="Bills" value={summary.totalBills || 0} hint="Accounts Payable" href="/dashboard/accounting/bills" tone="amber" />
        <KpiCard label="Transactions" value={summary.totalTransactions || 0} hint="All time" href="/dashboard/accounting/transactions" tone="blue" />
        <KpiCard label="Assets" value={summary.totalAssets || 0} hint="Active fixed assets" href="/dashboard/accounting/assets" tone="purple" />
      </div>

      {/* P&L summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <PnlCard label="Revenue" value={fmtINR(income.revenue)} tone="positive" />
        <PnlCard label="Expenses" value={fmtINR(income.expenses)} tone="negative" />
        <PnlCard label="Net Income" value={fmtINR(income.netIncome)} tone={income.netIncome >= 0 ? 'highlight' : 'negative'} />
      </div>

      {/* Aging side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AgingCard
          title="Receivables Aging"
          totalLabel="Outstanding to collect"
          total={arAging.totalOutstanding}
          aging={arAging.aging}
          href="/dashboard/accounting/invoices"
          tone="emerald"
        />
        <AgingCard
          title="Payables Aging"
          totalLabel="Outstanding to pay"
          total={apAging.totalOutstanding}
          aging={apAging.aging}
          href="/dashboard/accounting/bills"
          tone="amber"
        />
      </div>

      {loading && <div className="mt-4 text-sm text-gray-500">Loading…</div>}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
  tone: 'emerald' | 'amber' | 'blue' | 'purple';
}) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-300',
    amber: 'from-amber-500 to-orange-300',
    blue: 'from-blue-500 to-sky-300',
    purple: 'from-violet-500 to-fuchsia-300',
  };
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition block"
    >
      <div className={`h-1 -mx-4 -mt-4 mb-3 rounded-t-lg bg-gradient-to-r ${tones[tone]}`} />
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-3xl font-semibold text-gray-900 mt-1">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{hint}</div>
    </Link>
  );
}

function PnlCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'positive' | 'negative' | 'highlight';
}) {
  const styles: Record<string, string> = {
    positive: 'bg-white border-gray-200',
    negative: 'bg-white border-gray-200',
    highlight: 'bg-gradient-to-br from-emerald-700 to-teal-900 text-white border-transparent',
  };
  return (
    <div className={`rounded-lg p-5 border ${styles[tone]}`}>
      <div className={`text-xs uppercase tracking-wide ${tone === 'highlight' ? 'text-white/70' : 'text-gray-500'}`}>
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function AgingCard({
  title,
  totalLabel,
  total,
  aging,
  href,
  tone,
}: {
  title: string;
  totalLabel: string;
  total?: number;
  aging?: { current?: number; overdue30?: number; overdue60?: number; overdue90?: number };
  href: string;
  tone: 'emerald' | 'amber';
}) {
  const buckets = [
    { label: 'Current', value: aging?.current || 0 },
    { label: '1-30 days', value: aging?.overdue30 || 0 },
    { label: '31-60 days', value: aging?.overdue60 || 0 },
    { label: '60+ days', value: aging?.overdue90 || 0 },
  ];
  const max = Math.max(1, ...buckets.map((b) => b.value));
  const barColor = tone === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <Link href={href} className="text-xs text-emerald-700 hover:underline">
          View →
        </Link>
      </div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{totalLabel}</div>
      <div className="text-2xl font-semibold text-gray-900 mb-4">{fmtINR(total || 0)}</div>
      <div className="space-y-2">
        {buckets.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <div className="w-24 text-xs text-gray-600">{b.label}</div>
            <div className="flex-1 bg-gray-100 rounded h-5 relative">
              <div className={`absolute inset-y-0 left-0 ${barColor} rounded`} style={{ width: `${(b.value / max) * 100}%` }} />
              <div className="relative px-2 h-full flex items-center text-[11px] text-gray-700">{b.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
