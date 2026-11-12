'use client';

import { useEffect, useState } from 'react';
import { AppHome, HomeBars, HomePanel } from '@/components/platform/AppHome';
import { fmtINR } from './_components/ui';

type Summary = {
  totalInvoices?: number;
  totalBills?: number;
  totalTransactions?: number;
  totalAssets?: number;
};

type Aging = { current?: number; overdue30?: number; overdue60?: number; overdue90?: number };
type AgingReport = { totalOutstanding?: number; aging?: Aging };
type Income = { revenue?: number; expenses?: number; netIncome?: number };

export default function AccountingHome() {
  const [summary, setSummary] = useState<Summary>({});
  const [income, setIncome] = useState<Income>({});
  const [arAging, setArAging] = useState<AgingReport>({});
  const [apAging, setApAging] = useState<AgingReport>({});
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppHome
      app="accounting"
      title="Financial Overview"
      subtitle="Your books at a glance."
      action={{ href: '/dashboard/accounting/transactions', label: '+ New Transaction' }}
      loading={loading}
      metrics={[
        { label: 'Invoices', value: summary.totalInvoices || 0, hint: 'Accounts Receivable', href: '/dashboard/accounting/invoices' },
        { label: 'Bills', value: summary.totalBills || 0, hint: 'Accounts Payable', href: '/dashboard/accounting/bills' },
        { label: 'Transactions', value: summary.totalTransactions || 0, hint: 'All time', href: '/dashboard/accounting/transactions' },
        { label: 'Assets', value: summary.totalAssets || 0, hint: 'Active fixed assets', href: '/dashboard/accounting/assets' },
        { label: 'To Collect', value: fmtINR(arAging.totalOutstanding || 0), hint: 'Receivables outstanding', href: '/dashboard/accounting/invoices' },
        { label: 'To Pay', value: fmtINR(apAging.totalOutstanding || 0), hint: 'Payables outstanding', href: '/dashboard/accounting/bills' },
      ]}
      highlights={[
        { label: 'Revenue', value: fmtINR(income.revenue) },
        { label: 'Expenses', value: fmtINR(income.expenses) },
        { label: 'Net Income', value: fmtINR(income.netIncome), emphasis: (income.netIncome || 0) >= 0 },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AgingPanel title="Receivables Aging" report={arAging} href="/dashboard/accounting/invoices" loading={loading} />
        <AgingPanel title="Payables Aging" report={apAging} href="/dashboard/accounting/bills" loading={loading} />
      </div>
    </AppHome>
  );
}

function AgingPanel({ title, report, href, loading }: { title: string; report: AgingReport; href: string; loading: boolean }) {
  const a = report.aging || {};
  const buckets = [
    { label: 'Current', value: a.current || 0 },
    { label: '1-30 days', value: a.overdue30 || 0 },
    { label: '31-60 days', value: a.overdue60 || 0 },
    { label: '60+ days', value: a.overdue90 || 0 },
  ];
  return (
    <HomePanel title={title} link={{ href, label: 'View' }}>
      <HomeBars loading={loading} empty="Nothing outstanding." rows={buckets.map((b) => ({ ...b, caption: b.value }))} />
    </HomePanel>
  );
}
