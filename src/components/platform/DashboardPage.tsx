'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  CHART_LABELS,
  type ChartType,
  type DashboardComponentDTO,
  type DashboardDTO,
  type ReportDefinition,
  type ReportResult,
} from '@/lib/platform/report-types';
import { Badge, Btn, Checkbox, Empty, ErrorBanner, FormField, Input, Loading, Modal, Select, ThemeScope, api, useLoad } from './ui';
import { ReportChart, compact, full } from './ReportChart';
import { MODULE_THEMES } from './themes';

type DataMap = Record<string, { report?: ReportDefinition; result?: ReportResult; error?: string }>;

const EMPTY: DashboardDTO = { name: '', description: '', folder: 'private', components: [] };

export function DashboardPage({ id }: { id: string }) {
  const router = useRouter();
  const isNew = id === 'new';
  const dash = useLoad(() => (isNew ? Promise.resolve({ ...EMPTY, canEdit: true }) : api<DashboardDTO>(`/api/platform/dashboards/${id}`)), [id]);
  const data = useLoad(() => (isNew ? Promise.resolve({} as DataMap) : api<DataMap>(`/api/platform/dashboards/${id}/data`)), [id]);
  const reports = useLoad(() => api<ReportDefinition[]>('/api/platform/reports'), []);
  const [editing, setEditing] = useState<DashboardDTO | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const current = editing || dash.data;
  if (isNew && dash.data && !editing) setEditing(dash.data);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const saved = isNew
        ? await api<DashboardDTO>('/api/platform/dashboards', { body: editing })
        : await api<DashboardDTO>(`/api/platform/dashboards/${id}`, { method: 'PATCH', body: editing });
      if (isNew) router.push(`/dashboard/dashboards/${saved._id}`);
      else {
        dash.setData({ ...saved, canEdit: true });
        setEditing(null);
        data.reload();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!window.confirm('Delete this dashboard? The reports are kept.')) return;
    try {
      await api(`/api/platform/dashboards/${id}`, { method: 'DELETE' });
      router.push('/dashboard/reports');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const move = (i: number, d: number) => {
    if (!editing) return;
    const j = i + d;
    if (j < 0 || j >= editing.components.length) return;
    const next = [...editing.components];
    [next[i], next[j]] = [next[j], next[i]];
    setEditing({ ...editing, components: next });
  };

  return (
    <ThemeScope theme={MODULE_THEMES.setup}>
      <Link href="/dashboard/reports" className="text-sm text-[var(--p-accent)] hover:underline">
        ← Reports &amp; Dashboards
      </Link>
      <ErrorBanner error={dash.error || error} />
      {dash.loading && !current ? (
        <Loading />
      ) : current ? (
        <div className="mt-2">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            {editing ? (
              <div className="flex flex-wrap items-end gap-3">
                <FormField label="Dashboard name" required className="!mb-0">
                  <Input className="!w-72" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </FormField>
                <FormField label="Folder" className="!mb-0">
                  <Select className="!w-56" value={editing.folder} onChange={(e) => setEditing({ ...editing, folder: e.target.value as 'public' | 'private' })}>
                    <option value="private">Private — only you</option>
                    <option value="public">Public — everyone</option>
                  </Select>
                </FormField>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-[var(--p-text)]">{current.name}</h2>
                  {current.folder === 'public' ? <Badge tone="blue">Public</Badge> : <Badge>Private</Badge>}
                </div>
                {current.description && <p className="text-sm text-gray-600">{current.description}</p>}
                <p className="text-xs text-gray-500">Showing data you have access to.</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {editing ? (
                <>
                  <Btn onClick={() => setAdding(true)}>+ Add component</Btn>
                  <Btn onClick={() => (isNew ? router.push('/dashboard/reports') : setEditing(null))}>Cancel</Btn>
                  <Btn variant="primary" disabled={saving || !editing.name.trim()} onClick={save}>
                    {saving ? 'Saving…' : 'Save'}
                  </Btn>
                </>
              ) : (
                <>
                  <Btn onClick={data.reload}>Refresh</Btn>
                  {current.canEdit && (
                    <>
                      <Btn variant="primary" onClick={() => setEditing(current)}>
                        Edit
                      </Btn>
                      <Btn variant="danger" onClick={remove}>
                        Delete
                      </Btn>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <ErrorBanner error={data.error} />
          {current.components.length === 0 ? (
            <Empty>{editing ? 'Add components that show your reports as metrics, charts or tables.' : 'This dashboard has no components yet.'}</Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {current.components.map((c, i) => (
                <div key={c.id} className={c.size >= 3 ? 'md:col-span-3' : c.size === 2 ? 'md:col-span-2' : ''}>
                  <ComponentCard
                    comp={c}
                    entry={data.data?.[c.reportId]}
                    reportName={reports.data?.find((r) => r._id === c.reportId)?.name}
                    editing={Boolean(editing)}
                    onMove={(d) => move(i, d)}
                    onRemove={() => editing && setEditing({ ...editing, components: editing.components.filter((x) => x.id !== c.id) })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
      {adding && editing && (
        <AddComponentModal
          reports={(reports.data || []).filter((r) => editing.folder === 'private' || r.folder === 'public')}
          onClose={() => setAdding(false)}
          onAdd={(c) => {
            setEditing({ ...editing, components: [...editing.components, c] });
            setAdding(false);
          }}
        />
      )}
    </ThemeScope>
  );
}

function ComponentCard({
  comp,
  entry,
  reportName,
  editing,
  onMove,
  onRemove,
}: {
  comp: DashboardComponentDTO;
  entry?: { report?: ReportDefinition; result?: ReportResult; error?: string };
  reportName?: string;
  editing: boolean;
  onMove: (d: number) => void;
  onRemove: () => void;
}) {
  const r = entry?.result;
  const def = entry?.report;
  const idx = comp.aggregateIndex ?? -1;
  const valueLabel = r && idx >= 0 && r.aggregateLabels[idx] ? r.aggregateLabels[idx] : 'Record count';
  const title = comp.title || def?.name || reportName || 'Report';
  const chartType: ChartType = (comp.chartType as ChartType) || def?.chart?.type || 'column';

  return (
    <div className="bg-white border border-[var(--p-border)] rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-[#0b0b0b] truncate">{title}</div>
          {def?._id && !editing && (
            <Link href={`/dashboard/reports/${def._id}`} className="text-[11px] text-[var(--p-accent)] hover:underline">
              View report
            </Link>
          )}
        </div>
        {editing && (
          <div className="flex gap-2 text-xs text-gray-500 shrink-0">
            <button type="button" onClick={() => onMove(-1)} aria-label="Move left">
              ◀
            </button>
            <button type="button" onClick={() => onMove(1)} aria-label="Move right">
              ▶
            </button>
            <button type="button" className="text-red-600" onClick={onRemove}>
              Remove
            </button>
          </div>
        )}
      </div>
      {editing && !entry ? (
        <div className="text-xs text-gray-500 flex-1">
          {comp.kind} · {reportName} — preview after saving
        </div>
      ) : entry?.error ? (
        <div className="text-xs text-red-600">{entry.error}</div>
      ) : !r ? (
        <Loading />
      ) : comp.kind === 'metric' ? (
        <div className="flex-1 flex flex-col justify-center py-4">
          <div className="text-4xl font-semibold text-[#0b0b0b]" title={full(idx >= 0 ? r.totals.values[idx] : r.totals.count)}>
            {compact(idx >= 0 ? r.totals.values[idx] : r.totals.count)}
          </div>
          <div className="text-xs text-[#898781] mt-1">{valueLabel}</div>
        </div>
      ) : comp.kind === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {(r.chart.length ? r.chart : []).slice(0, 10).map((p) => (
                <tr key={p.label} className="border-t border-gray-100">
                  <td className="py-1.5 pr-2 text-[#52514e]">{p.label}</td>
                  <td className="py-1.5 text-right tabular-nums text-[#0b0b0b]">{full(p.value)}</td>
                </tr>
              ))}
              {!r.chart.length && (
                <tr>
                  <td className="py-2 text-xs text-gray-500">Group this report to show it as a table.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : r.chart.length ? (
        <ReportChart result={valueLabel === 'Record count' && idx < 0 ? r : withValues(r, idx)} type={chartType} valueLabel={valueLabel} height={comp.size >= 2 ? 280 : 220} />
      ) : (
        <div className="text-xs text-gray-500">This report isn&apos;t grouped, so there&apos;s nothing to chart. Use a metric instead.</div>
      )}
    </div>
  );
}

/** Re-point a result's chart values at a different summary than the report's own chart uses. */
function withValues(r: ReportResult, idx: number): ReportResult {
  if (idx < 0 || !r.groups.length) return r;
  return { ...r, chart: r.groups.map((g) => ({ label: g.label, value: g.values[idx] ?? 0 })) };
}

function AddComponentModal({
  reports,
  onClose,
  onAdd,
}: {
  reports: ReportDefinition[];
  onClose: () => void;
  onAdd: (c: DashboardComponentDTO) => void;
}) {
  const [reportId, setReportId] = useState(reports[0]?._id || '');
  const [kind, setKind] = useState<DashboardComponentDTO['kind']>('chart');
  const [chartType, setChartType] = useState<ChartType>('column');
  const [size, setSize] = useState(1);
  const [title, setTitle] = useState('');
  const [aggregateIndex, setAggregateIndex] = useState(-1);
  const report = reports.find((r) => r._id === reportId);
  const grouped = report && report.format !== 'tabular';

  return (
    <Modal
      open
      onClose={onClose}
      title="Add Dashboard Component"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            disabled={!reportId}
            onClick={() =>
              onAdd({ id: `c${Date.now().toString(36)}`, reportId, kind, chartType: kind === 'chart' ? chartType : undefined, size, title, aggregateIndex })
            }
          >
            Add
          </Btn>
        </>
      }
    >
      {reports.length === 0 ? (
        <p className="text-sm text-gray-600">Create a report first. Public dashboards can only use public reports.</p>
      ) : (
        <>
          <FormField label="Source report" required>
            <Select value={reportId} onChange={(e) => (setReportId(e.target.value), setAggregateIndex(-1))}>
              {reports.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} ({r.format}
                  {r.folder === 'private' ? ', private' : ''})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Display as">
            <div className="flex gap-4">
              {(['metric', 'chart', 'table'] as const).map((k) => (
                <Checkbox key={k} checked={kind === k} onChange={() => setKind(k)} disabled={k !== 'metric' && !grouped} label={<span className="capitalize">{k}</span>} />
              ))}
            </div>
            {!grouped && <p className="text-[11px] text-gray-500 mt-1">Charts and tables need a summary or matrix report.</p>}
          </FormField>
          {kind === 'chart' && grouped && (
            <FormField label="Chart type">
              <Select value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}>
                {(Object.keys(CHART_LABELS) as ChartType[])
                  .filter((t) => t !== 'none' && (t !== 'stackedColumn' || report?.format === 'matrix'))
                  .map((t) => (
                    <option key={t} value={t}>
                      {CHART_LABELS[t]}
                    </option>
                  ))}
              </Select>
            </FormField>
          )}
          <FormField label="Value">
            <Select value={aggregateIndex} onChange={(e) => setAggregateIndex(Number(e.target.value))}>
              <option value={-1}>Record count</option>
              {(report?.aggregates || []).map((a, i) => (
                <option key={i} value={i}>
                  {a.fn} of {a.field}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid sm:grid-cols-2 gap-x-4">
            <FormField label="Title (optional)">
              <Input value={title} placeholder={report?.name} onChange={(e) => setTitle(e.target.value)} />
            </FormField>
            <FormField label="Width">
              <Select value={size} onChange={(e) => setSize(Number(e.target.value))}>
                <option value={1}>Narrow (⅓)</option>
                <option value={2}>Medium (⅔)</option>
                <option value={3}>Full width</option>
              </Select>
            </FormField>
          </div>
        </>
      )}
    </Modal>
  );
}
