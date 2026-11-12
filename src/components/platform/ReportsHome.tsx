'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ReportDefinition } from '@/lib/platform/report-types';
import { Badge, Btn, Empty, ErrorBanner, Input, Loading, SectionTitle, Table, ThemeScope, api, td, th, useLoad } from './ui';
import { MODULE_THEMES } from './themes';

function when(s?: string) {
  return s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

export function ReportsHome() {
  const [q, setQ] = useState('');
  const reports = useLoad(() => api<ReportDefinition[]>('/api/platform/reports'), []);
  const ql = q.toLowerCase();
  const reportRows = useMemo(() => (reports.data || []).filter((r) => !ql || r.name.toLowerCase().includes(ql)), [reports.data, ql]);

  return (
    <ThemeScope theme={MODULE_THEMES.setup}>
      <SectionTitle
        title="Reports"
        subtitle="Build reports on Sell & Support and custom modules. Public reports can be added to any app's Home. Everyone sees only the records and fields their access allows."
        actions={
          <>
            <Input className="!w-56" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Link href="/dashboard/reports/new">
              <Btn variant="primary">+ New Report</Btn>
            </Link>
          </>
        }
      />
      <div className="pt-2">
        <ErrorBanner error={reports.error} />
        {reports.loading && !reports.data ? (
          <Loading />
        ) : !reportRows.length ? (
          <Empty>
            No reports yet. <Link href="/dashboard/reports/new" className="text-[var(--p-accent)] hover:underline">Create your first report</Link>.
          </Empty>
        ) : (
          <Table
            head={
              <tr>
                <th className={th}>Report</th>
                <th className={th}>Module</th>
                <th className={th}>Format</th>
                <th className={th}>Folder</th>
                <th className={th}>Owner</th>
                <th className={th}>Modified</th>
              </tr>
            }
          >
            {reportRows.map((r) => (
              <tr key={r._id} className="hover:bg-gray-50">
                <td className={td}>
                  <Link href={`/dashboard/reports/${r._id}`} className="font-medium text-[var(--p-accent)] hover:underline">
                    {r.name}
                  </Link>
                  {r.description && <div className="text-xs text-gray-500">{r.description}</div>}
                </td>
                <td className={`${td} text-gray-600`}>{r.objectApiName}</td>
                <td className={`${td} capitalize text-gray-600`}>{r.format}</td>
                <td className={td}>{r.folder === 'public' ? <Badge tone="blue">Public</Badge> : <Badge>Private</Badge>}</td>
                <td className={`${td} text-gray-600`}>{r.ownerName || '—'}</td>
                <td className={`${td} text-xs text-gray-600`}>{when(r.updatedAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </ThemeScope>
  );
}
