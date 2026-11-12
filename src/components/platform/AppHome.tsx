'use client';

/**
 * Universal app Home dashboard. Every app's Home renders:
 *   1. a header with the app's primary action,
 *   2. its default metrics (same tile design in every app, in the app's colours),
 *   3. the app's default panels (passed as children),
 *   4. report components the workspace has added to this Home (shared by everyone;
 *      people with "Manage Public Reports & Home Dashboards" can customise them).
 */
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import {
  CHART_LABELS,
  type ChartType,
  type DashboardComponentDTO,
  type HomeDashboardDTO,
  type HomeDataMap,
  type ReportDefinition,
  type ReportResult,
} from '@/lib/platform/report-types';
import { APP_LABELS, type AppKey } from '@/lib/platform/types';
import { Btn, Checkbox, ErrorBanner, FormField, Input, Loading, Modal, Select, ThemeScope, api, useLoad } from './ui';
import { ReportChart, compact, full } from './ReportChart';
import { MODULE_THEMES } from './themes';

export interface HomeMetric {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  /** Filled with the app colour — use for the headline figure of a row. */
  emphasis?: boolean;
}

export function AppHome({
  app,
  title,
  subtitle,
  action,
  metrics,
  highlights,
  loading,
  children,
}: {
  app: AppKey;
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
  /** Default count metrics (first row). */
  metrics: HomeMetric[];
  /** Default headline figures (second row, larger tiles). */
  highlights?: HomeMetric[];
  loading?: boolean;
  /** The app's default panels. */
  children?: ReactNode;
}) {
  const home = useLoad(() => api<HomeDashboardDTO>(`/api/platform/home/${app}`), [app]);
  const [editing, setEditing] = useState<DashboardComponentDTO[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const components = editing || home.data?.components || [];
  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      home.setData(await api<HomeDashboardDTO>(`/api/platform/home/${app}`, { method: 'PUT', body: { components: editing } }));
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const move = (i: number, d: number) => {
    if (!editing) return;
    const j = i + d;
    if (j < 0 || j >= editing.length) return;
    const next = [...editing];
    [next[i], next[j]] = [next[j], next[i]];
    setEditing(next);
  };

  return (
    <ThemeScope theme={MODULE_THEMES[app]} className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--p-muted)]">{APP_LABELS[app]}</div>
          <h1 className="text-2xl font-semibold text-[var(--p-text)]">{title}</h1>
          {subtitle && <p className="text-sm text-[var(--p-muted)] mt-1">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {home.data?.canEdit && !editing && (
            <Btn onClick={() => setEditing(home.data?.components || [])}>Customize Home</Btn>
          )}
          {editing && (
            <>
              <Btn onClick={() => setAdding(true)}>+ Add report</Btn>
              <Btn onClick={() => (setEditing(null), setError(null))}>Cancel</Btn>
              <Btn variant="primary" disabled={saving} onClick={save}>
                {saving ? 'Saving…' : 'Save'}
              </Btn>
            </>
          )}
          {action && !editing && (
            <Link href={action.href} className="px-4 py-2 text-sm rounded text-white bg-[var(--p-accent)] hover:opacity-90 shadow-sm">
              {action.label}
            </Link>
          )}
        </div>
      </div>

      <MetricGrid metrics={metrics} loading={loading} className="grid-cols-2 md:grid-cols-3 lg:grid-cols-6" />
      {highlights && highlights.length > 0 && (
        <MetricGrid
          metrics={highlights}
          loading={loading}
          large
          className={highlights.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}
        />
      )}

      {children && <div className="space-y-4">{children}</div>}

      {/* Report components added to this Home */}
      {(components.length > 0 || editing || error) && (
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[var(--p-text)]">From your reports</h2>
            {!editing && (
              <button type="button" onClick={home.reload} className="text-xs text-[var(--p-accent)] hover:underline">
                Refresh
              </button>
            )}
          </div>
          <ErrorBanner error={error} />
          {components.length === 0 ? (
            <div className="border border-dashed border-[var(--p-border)] rounded-lg p-6 text-sm text-center text-[var(--p-muted)]">
              Add public reports as metrics, charts or tables. Everyone using {APP_LABELS[app]} sees them here, limited to the records they can access.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {components.map((c, i) => (
                <div key={c.id} className={c.size >= 3 ? 'md:col-span-3' : c.size === 2 ? 'md:col-span-2' : ''}>
                  <ComponentCard
                    comp={c}
                    entry={home.data?.data[c.reportId]}
                    editing={Boolean(editing)}
                    onMove={(d) => move(i, d)}
                    onRemove={() => editing && setEditing(editing.filter((x) => x.id !== c.id))}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {adding && editing && (
        <AddComponentModal
          onClose={() => setAdding(false)}
          onAdd={(c) => {
            let n = editing.length + 1;
            while (editing.some((x) => x.id === `c${n}`)) n++;
            setEditing([...editing, { ...c, id: `c${n}` }]);
            setAdding(false);
          }}
        />
      )}
    </ThemeScope>
  );
}

/* ------------------------------------------------------------------ */
/* Default metrics                                                     */
/* ------------------------------------------------------------------ */

function MetricGrid({ metrics, loading, large, className }: { metrics: HomeMetric[]; loading?: boolean; large?: boolean; className: string }) {
  if (!metrics.length) return null;
  return (
    <div className={`grid gap-4 mb-6 ${className}`}>
      {metrics.map((m) => (
        <MetricTile key={m.label} metric={m} loading={loading} large={large} />
      ))}
    </div>
  );
}

function MetricTile({ metric, loading, large }: { metric: HomeMetric; loading?: boolean; large?: boolean }) {
  const { label, value, hint, href, emphasis } = metric;
  const body = (
    <>
      {!emphasis && <div className="h-1 -mx-4 -mt-4 mb-3 rounded-t-lg bg-[var(--p-accent)] opacity-80" />}
      <div className={`text-xs uppercase tracking-wide ${emphasis ? 'text-white/75' : 'text-[var(--p-muted)]'}`}>{label}</div>
      <div className={`${large ? 'text-2xl' : 'text-3xl'} font-semibold mt-1 ${emphasis ? '' : 'text-[var(--p-text)]'}`}>
        {loading ? <span className="opacity-40">—</span> : value}
      </div>
      {hint && <div className={`text-xs mt-1 ${emphasis ? 'text-white/75' : 'text-[var(--p-muted)]'}`}>{hint}</div>}
    </>
  );
  const cls = `rounded-lg p-4 border block transition ${
    emphasis ? 'bg-[var(--p-accent)] text-white border-transparent' : 'bg-white border-[var(--p-border)]'
  } ${href ? 'hover:shadow-md' : ''}`;
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Standard card for an app's default Home panels. */
export function HomePanel({ title, link, children, className = '' }: { title: string; link?: { href: string; label: string }; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[var(--p-border)] rounded-lg p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[var(--p-text)]">{title}</h2>
        {link && (
          <Link href={link.href} className="text-xs text-[var(--p-accent)] hover:underline">
            {link.label} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

/** Horizontal bars for a panel (label, relative bar, caption). */
export function HomeBars({ rows, empty, loading }: { rows: { label: string; value: number; caption: ReactNode }[]; empty: string; loading?: boolean }) {
  if (loading) return <div className="text-sm text-[var(--p-muted)]">Loading…</div>;
  if (!rows.length) return <div className="text-sm text-[var(--p-muted)]">{empty}</div>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <div className="w-32 text-sm text-[var(--p-text)] truncate" title={r.label}>
            {r.label}
          </div>
          <div className="flex-1 bg-[var(--p-accent-bg)] rounded h-6 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-[var(--p-accent)] opacity-60 rounded" style={{ width: `${(r.value / max) * 100}%` }} />
            <div className="relative px-2 h-full flex items-center text-xs text-[var(--p-text)]">{r.caption}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Report components                                                   */
/* ------------------------------------------------------------------ */

function ComponentCard({
  comp,
  entry,
  editing,
  onMove,
  onRemove,
}: {
  comp: DashboardComponentDTO;
  entry?: HomeDataMap[string];
  editing: boolean;
  onMove: (d: number) => void;
  onRemove: () => void;
}) {
  const r = entry?.result;
  const def = entry?.report;
  const idx = comp.aggregateIndex ?? -1;
  const valueLabel = r && idx >= 0 && r.aggregateLabels[idx] ? r.aggregateLabels[idx] : 'Record count';
  const title = comp.title || def?.name || 'Report';
  const chartType: ChartType = (comp.chartType as ChartType) || def?.chart?.type || 'column';

  return (
    <div className="bg-white border border-[var(--p-border)] rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-[var(--p-text)] truncate">{title}</div>
          {def?._id && !editing && (
            <Link href={`/dashboard/reports/${def._id}`} className="text-[11px] text-[var(--p-accent)] hover:underline">
              View report
            </Link>
          )}
        </div>
        {editing && (
          <div className="flex gap-2 text-xs text-gray-500 shrink-0">
            <button type="button" onClick={() => onMove(-1)} aria-label="Move earlier">
              ◀
            </button>
            <button type="button" onClick={() => onMove(1)} aria-label="Move later">
              ▶
            </button>
            <button type="button" className="text-red-600" onClick={onRemove}>
              Remove
            </button>
          </div>
        )}
      </div>
      {editing && !entry ? (
        <div className="text-xs text-gray-500 flex-1 capitalize">{comp.kind} — preview after saving</div>
      ) : entry?.error ? (
        <div className="text-xs text-red-600">{entry.error}</div>
      ) : !r ? (
        <Loading />
      ) : comp.kind === 'metric' ? (
        <div className="flex-1 flex flex-col justify-center py-4">
          <div className="text-4xl font-semibold text-[var(--p-text)]" title={full(idx >= 0 ? r.totals.values[idx] : r.totals.count)}>
            {compact(idx >= 0 ? r.totals.values[idx] : r.totals.count)}
          </div>
          <div className="text-xs text-[var(--p-muted)] mt-1">{valueLabel}</div>
        </div>
      ) : comp.kind === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {r.chart.slice(0, 10).map((p) => (
                <tr key={p.label} className="border-t border-gray-100">
                  <td className="py-1.5 pr-2 text-[#52514e]">{p.label}</td>
                  <td className="py-1.5 text-right tabular-nums text-[var(--p-text)]">{full(p.value)}</td>
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
        <ReportChart result={idx < 0 ? r : withValues(r, idx)} type={chartType} valueLabel={valueLabel} height={comp.size >= 2 ? 280 : 220} />
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

function AddComponentModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Omit<DashboardComponentDTO, 'id'>) => void }) {
  const all = useLoad(() => api<ReportDefinition[]>('/api/platform/reports'), []);
  const reports = (all.data || []).filter((r) => r.folder === 'public');
  const [picked, setPicked] = useState('');
  const [kind, setKind] = useState<DashboardComponentDTO['kind']>('chart');
  const [chartType, setChartType] = useState<ChartType>('column');
  const [size, setSize] = useState(1);
  const [title, setTitle] = useState('');
  const [aggregateIndex, setAggregateIndex] = useState(-1);
  const reportId = picked || reports[0]?._id || '';
  const report = reports.find((r) => r._id === reportId);
  const grouped = Boolean(report && report.format !== 'tabular');
  const effectiveKind = grouped ? kind : 'metric';
  function add() {
    onAdd({
      reportId,
      kind: effectiveKind,
      chartType: effectiveKind === 'chart' ? chartType : undefined,
      size,
      title,
      aggregateIndex,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add Report to Home"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            disabled={!reportId}
            onClick={add}
          >
            Add
          </Btn>
        </>
      }
    >
      <ErrorBanner error={all.error} />
      {all.loading && !all.data ? (
        <Loading />
      ) : reports.length === 0 ? (
        <p className="text-sm text-gray-600">
          Home pages show reports from the public folder.{' '}
          <Link href="/dashboard/reports/new" className="text-[var(--p-accent)] hover:underline">
            Create a public report
          </Link>{' '}
          first.
        </p>
      ) : (
        <>
          <FormField label="Source report" required>
            <Select value={reportId} onChange={(e) => (setPicked(e.target.value), setAggregateIndex(-1))}>
              {reports.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} ({r.format})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Display as">
            <div className="flex gap-4">
              {(['metric', 'chart', 'table'] as const).map((k) => (
                <Checkbox
                  key={k}
                  checked={effectiveKind === k}
                  onChange={() => setKind(k)}
                  disabled={k !== 'metric' && !grouped}
                  label={<span className="capitalize">{k}</span>}
                />
              ))}
            </div>
            {!grouped && <p className="text-[11px] text-gray-500 mt-1">Charts and tables need a summary or matrix report.</p>}
          </FormField>
          {effectiveKind === 'chart' && (
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
