'use client';

import { useEffect, useState } from 'react';
import { AppHome, HomeBars, HomePanel } from '@/components/platform/AppHome';

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
        setSummary(s && !s.error ? s : {});
        setPipeline(Array.isArray(p?.stages) ? p.stages : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppHome
      app="sales-service"
      title="Welcome back"
      subtitle="Your CRM at a glance."
      action={{ href: '/dashboard/sales-service/leads', label: '+ New Enquiry' }}
      loading={loading}
      metrics={[
        { label: 'Companies', value: summary.totalAccounts || 0, href: '/dashboard/sales-service/accounts' },
        { label: 'People', value: summary.totalContacts || 0, href: '/dashboard/sales-service/contacts' },
        { label: 'Open Enquiries', value: summary.openLeads || 0, href: '/dashboard/sales-service/leads' },
        { label: 'Open Deals', value: summary.openOpportunities || 0, href: '/dashboard/sales-service/opportunities' },
        { label: 'Open Tickets', value: summary.openCases || 0, href: '/dashboard/sales-service/cases' },
        { label: 'Overdue', value: summary.overdueActivities || 0, hint: 'Activities', href: '/dashboard/sales-service/activities' },
      ]}
      highlights={[
        { label: 'Pipeline Value', value: fmtINR(summary.pipelineValue), hint: 'All open deals' },
        { label: 'Weighted Forecast', value: fmtINR(summary.weightedPipeline), hint: 'By deal stage probability' },
        { label: 'Closed Won (QTD)', value: fmtINR(summary.wonThisQuarter), hint: 'Quarter to date', emphasis: true },
      ]}
    >
      <HomePanel title="Pipeline by Deal Stage" link={{ href: '/dashboard/sales-service/opportunities', label: 'View pipeline' }}>
        <HomeBars
          loading={loading}
          empty="No deals yet."
          rows={pipeline.map((s) => ({ label: s._id, value: s.total, caption: `${s.count} • ${fmtINR(s.total)}` }))}
        />
      </HomePanel>
    </AppHome>
  );
}
