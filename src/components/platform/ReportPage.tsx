'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { DescribeResponse } from '@/lib/platform/types';
import type { ReportDefinition, ReportResult } from '@/lib/platform/report-types';
import { Badge, Btn, ErrorBanner, Loading, ThemeScope, api, useLoad } from './ui';
import { ReportBuilder, emptyReport } from './ReportBuilder';
import { ReportView } from './ReportView';
import { MODULE_THEMES } from './themes';

export function ReportPage({ id }: { id: string }) {
  const router = useRouter();
  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const [actionError, setActionError] = useState<string | null>(null);
  const report = useLoad(() => (isNew ? Promise.resolve(emptyReport()) : api<ReportDefinition>(`/api/platform/reports/${id}`)), [id]);
  const result = useLoad(() => (isNew ? Promise.resolve(null) : api<ReportResult>(`/api/platform/reports/${id}/run`)), [id]);
  const describe = useLoad(
    () => (report.data?.objectApiName ? api<DescribeResponse>(`/api/platform/describe/${report.data.objectApiName}`) : Promise.resolve(null)),
    [report.data?.objectApiName],
  );

  const exportCsv = async () => {
    setActionError(null);
    try {
      const res = await fetch(`/api/platform/reports/${id}/export`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.data?.apiName || 'report'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setActionError((e as Error).message);
    }
  };
  const remove = async () => {
    if (!window.confirm('Delete this report? It is also removed from app Home pages.')) return;
    try {
      await api(`/api/platform/reports/${id}`, { method: 'DELETE' });
      router.push('/dashboard/reports');
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  return (
    <ThemeScope theme={MODULE_THEMES.setup}>
      <Link href="/dashboard/reports" className="text-sm text-[var(--p-accent)] hover:underline">
        ← Reports
      </Link>
      <ErrorBanner error={report.error || actionError} />
      {report.loading && !report.data ? (
        <Loading />
      ) : report.data && editing ? (
        <div className="mt-2">
          <ReportBuilder
            initial={report.data}
            onCancel={() => (isNew ? router.push('/dashboard/reports') : setEditing(false))}
            onSaved={(saved) => {
              if (isNew) router.push(`/dashboard/reports/${saved._id}`);
              else {
                report.setData(saved);
                setEditing(false);
                result.reload();
              }
            }}
          />
        </div>
      ) : report.data ? (
        <div className="mt-2">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-[var(--p-text)]">{report.data.name}</h2>
                {report.data.folder === 'public' ? <Badge tone="blue">Public</Badge> : <Badge>Private</Badge>}
              </div>
              {report.data.description && <p className="text-sm text-gray-600">{report.data.description}</p>}
              <p className="text-xs text-gray-500 mt-0.5">
                {report.data.objectApiName} · {report.data.format} · by {report.data.ownerName || 'unknown'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={result.reload}>Refresh</Btn>
              <Btn onClick={exportCsv}>Export CSV</Btn>
              {report.data.canEdit && (
                <>
                  <Btn variant="primary" onClick={() => setEditing(true)}>
                    Edit
                  </Btn>
                  <Btn variant="danger" onClick={remove}>
                    Delete
                  </Btn>
                </>
              )}
            </div>
          </div>
          <ErrorBanner error={result.error} />
          {result.loading && !result.data ? (
            <Loading label="Running report…" />
          ) : result.data ? (
            <ReportView def={report.data} result={result.data} fields={describe.data?.object.fields} />
          ) : null}
        </div>
      ) : null}
    </ThemeScope>
  );
}
