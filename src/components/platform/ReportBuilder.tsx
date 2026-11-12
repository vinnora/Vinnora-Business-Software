'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DescribeResponse, FieldDescribe } from '@/lib/platform/types';
import {
  AGG_LABELS,
  CHART_LABELS,
  type AggregateFn,
  type ChartType,
  type DateGranularity,
  type ReportDefinition,
  type ReportResult,
} from '@/lib/platform/report-types';
import { Btn, Checkbox, ErrorBanner, FormField, Input, Loading, Modal, Select, TextArea, api, useLoad } from './ui';
import { ConditionBuilder } from './RuleEditors';
import { ReportView } from './ReportView';

type ObjOption = { apiName: string; label: string; pluralLabel: string; app: string };
const NUMERIC = new Set(['number', 'currency', 'percent']);
const GRAN: DateGranularity[] = ['day', 'week', 'month', 'quarter', 'year'];

const effType = (f?: FieldDescribe) => (f?.type === 'formula' ? f.returnType || 'text' : f?.type || 'text');
const isDate = (f?: FieldDescribe) => ['date', 'datetime'].includes(effType(f));
const groupable = (f: FieldDescribe) => !['textarea', 'url'].includes(f.type) && f.apiName !== '_id';

export function emptyReport(objectApiName = ''): ReportDefinition {
  return {
    name: '',
    folder: 'private',
    objectApiName,
    format: 'tabular',
    columns: [],
    filters: [],
    filterLogic: '',
    scope: 'all',
    groupings: [],
    columnGrouping: null,
    aggregates: [],
    sort: null,
    chart: null,
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-200 pb-3 mb-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 mb-2">{title}</div>
      {children}
    </div>
  );
}

export function ReportBuilder({
  initial,
  onSaved,
  onCancel,
}: {
  initial: ReportDefinition;
  onSaved: (def: ReportDefinition) => void;
  onCancel: () => void;
}) {
  const [def, setDef] = useState<ReportDefinition>(initial);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const objects = useLoad(() => api<{ objects: ObjOption[] }>('/api/platform/data-loader/objects').then((r) => r.objects), []);
  const describe = useLoad(
    () => (def.objectApiName ? api<DescribeResponse>(`/api/platform/describe/${def.objectApiName}`) : Promise.resolve(null)),
    [def.objectApiName],
  );
  const fields = useMemo(() => describe.data?.object.fields || [], [describe.data]);
  const byApi = useMemo(() => new Map(fields.map((f) => [f.apiName, f])), [fields]);

  const set = (patch: Partial<ReportDefinition>) => setDef((d) => ({ ...d, ...patch }));

  // Pick sensible defaults when an object is chosen
  useEffect(() => {
    if (!describe.data || def.columns.length) return;
    const nameFields = describe.data.object.nameFields.filter((n) => byApi.has(n));
    const others = fields.filter((f) => !f.isSystem && !nameFields.includes(f.apiName) && f.type !== 'textarea').slice(0, 4).map((f) => f.apiName);
    set({ columns: [...nameFields, ...others] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [describe.data]);

  // Debounced live preview
  const seq = useRef(0);
  useEffect(() => {
    if (!def.objectApiName || !def.columns.length) {
      setResult(null);
      return;
    }
    if (def.format !== 'tabular' && !def.groupings.length) return;
    if (def.format === 'matrix' && !def.columnGrouping) return;
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setRunning(true);
      try {
        const r = await api<ReportResult>('/api/platform/reports/preview', { body: def });
        if (id === seq.current) {
          setResult(r);
          setPreviewError(null);
        }
      } catch (e) {
        if (id === seq.current) setPreviewError((e as Error).message);
      } finally {
        if (id === seq.current) setRunning(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [def]);

  const [saveOpen, setSaveOpen] = useState(false);
  const save = async (meta: { name: string; description: string; folder: 'public' | 'private' }) => {
    setSaving(true);
    try {
      const body = { ...def, ...meta };
      const saved = def._id
        ? await api<ReportDefinition>(`/api/platform/reports/${def._id}`, { method: 'PATCH', body })
        : await api<ReportDefinition>('/api/platform/reports', { body });
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  };

  const available = fields.filter((f) => !def.columns.includes(f.apiName));
  const numericFields = fields.filter((f) => NUMERIC.has(effType(f)));
  const filterFields = fields.filter((f) => f.type !== 'formula');

  const groupingRow = (g: { field: string; granularity?: DateGranularity } | null | undefined, onChange: (g: { field: string; granularity?: DateGranularity } | null) => void, allowNone: boolean) => (
    <div className="flex gap-2 mb-2">
      <Select value={g?.field || ''} onChange={(e) => onChange(e.target.value ? { field: e.target.value, granularity: isDate(byApi.get(e.target.value)) ? 'month' : undefined } : null)}>
        {allowNone && <option value="">— none —</option>}
        {!allowNone && !g?.field && <option value="">— choose field —</option>}
        {fields.filter(groupable).map((f) => (
          <option key={f.apiName} value={f.apiName}>
            {f.label}
          </option>
        ))}
      </Select>
      {g?.field && isDate(byApi.get(g.field)) && (
        <Select className="!w-28" value={g.granularity || 'month'} onChange={(e) => onChange({ ...g, granularity: e.target.value as DateGranularity })}>
          {GRAN.map((x) => (
            <option key={x} value={x}>
              by {x}
            </option>
          ))}
        </Select>
      )}
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="bg-white border border-[var(--p-border)] rounded-lg p-4 self-start lg:sticky lg:top-2 lg:max-h-[calc(100vh-1rem)] lg:overflow-y-auto">
        <Section title="Report on">
          <Select
            value={def.objectApiName}
            disabled={Boolean(def._id)}
            onChange={(e) => setDef({ ...emptyReport(e.target.value), name: def.name, folder: def.folder })}
          >
            <option value="">— choose a module —</option>
            {(objects.data || []).map((o) => (
              <option key={o.apiName} value={o.apiName}>
                {o.pluralLabel}
              </option>
            ))}
          </Select>
          {objects.error && <div className="text-xs text-red-600 mt-1">{objects.error}</div>}
        </Section>

        {def.objectApiName && describe.data && (
          <>
            <Section title="Format">
              <div className="grid grid-cols-3 gap-1">
                {(['tabular', 'summary', 'matrix'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() =>
                      set({
                        format: f,
                        groupings: f === 'tabular' ? [] : def.groupings.length ? def.groupings.slice(0, f === 'matrix' ? 1 : 3) : [],
                        columnGrouping: f === 'matrix' ? def.columnGrouping : null,
                        chart: f === 'tabular' ? null : def.chart,
                      })
                    }
                    className={`px-2 py-1.5 text-xs rounded border capitalize ${def.format === f ? 'border-[var(--p-accent)] bg-[var(--p-accent-bg)] text-[var(--p-accent)] font-medium' : 'border-gray-300 text-gray-700'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {def.format === 'tabular' ? 'A simple list of records.' : def.format === 'summary' ? 'Records grouped into rows with subtotals.' : 'Totals in a grid grouped by rows and columns.'}
              </p>
            </Section>

            {def.format !== 'tabular' && (
              <Section title={def.format === 'matrix' ? 'Group rows by' : 'Group by (up to 3)'}>
                {def.groupings.map((g, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <div className="flex-1 min-w-0">
                      {groupingRow(g, (ng) => set({ groupings: ng ? def.groupings.map((x, j) => (j === i ? ng : x)) : def.groupings.filter((_, j) => j !== i) }), true)}
                    </div>
                  </div>
                ))}
                {(def.format === 'summary' ? def.groupings.length < 3 : def.groupings.length < 1) &&
                  groupingRow(null, (ng) => ng && set({ groupings: [...def.groupings, ng] }), false)}
                {def.format === 'matrix' && (
                  <>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 mt-2 mb-2">Group columns by</div>
                    {groupingRow(def.columnGrouping, (ng) => set({ columnGrouping: ng }), false)}
                  </>
                )}
              </Section>
            )}

            <Section title="Columns">
              <ul className="space-y-1 mb-2">
                {def.columns.map((c, i) => (
                  <li key={c} className="flex items-center gap-1 text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1">
                    <span className="flex-1 truncate">{byApi.get(c)?.label || c}</span>
                    <button type="button" className="text-gray-400 hover:text-gray-700 text-xs" aria-label="Move up" onClick={() => i > 0 && set({ columns: swap(def.columns, i, i - 1) })}>
                      ▲
                    </button>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-700 text-xs"
                      aria-label="Move down"
                      onClick={() => i < def.columns.length - 1 && set({ columns: swap(def.columns, i, i + 1) })}
                    >
                      ▼
                    </button>
                    <button type="button" className="text-gray-400 hover:text-red-600" aria-label={`Remove ${c}`} onClick={() => set({ columns: def.columns.filter((x) => x !== c) })}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <Select value="" onChange={(e) => e.target.value && set({ columns: [...def.columns, e.target.value] })}>
                <option value="">+ Add column…</option>
                {available.map((f) => (
                  <option key={f.apiName} value={f.apiName}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Section>

            {def.format !== 'tabular' && (
              <Section title="Summaries">
                {def.aggregates.map((a, i) => (
                  <div key={i} className="flex gap-1 mb-1">
                    <Select className="!w-24" value={a.fn} onChange={(e) => set({ aggregates: def.aggregates.map((x, j) => (j === i ? { ...x, fn: e.target.value as AggregateFn } : x)) })}>
                      {(['sum', 'avg', 'min', 'max'] as const).map((fn) => (
                        <option key={fn} value={fn}>
                          {AGG_LABELS[fn]}
                        </option>
                      ))}
                    </Select>
                    <Select value={a.field} onChange={(e) => set({ aggregates: def.aggregates.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)) })}>
                      {numericFields.map((f) => (
                        <option key={f.apiName} value={f.apiName}>
                          {f.label}
                        </option>
                      ))}
                    </Select>
                    <button type="button" className="text-gray-400 hover:text-red-600 px-1" aria-label="Remove summary" onClick={() => set({ aggregates: def.aggregates.filter((_, j) => j !== i) })}>
                      ×
                    </button>
                  </div>
                ))}
                {numericFields.length > 0 ? (
                  <Btn size="sm" variant="ghost" onClick={() => set({ aggregates: [...def.aggregates, { field: numericFields[0].apiName, fn: 'sum' }] })}>
                    + Add summary
                  </Btn>
                ) : (
                  <p className="text-[11px] text-gray-500">This module has no number fields to summarise. Record counts are always shown.</p>
                )}
              </Section>
            )}

            <Section title="Filters">
              <Select className="mb-2" value={def.scope} onChange={(e) => set({ scope: e.target.value as 'all' | 'mine' })}>
                <option value="all">All {describe.data.object.pluralLabel.toLowerCase()} I can see</option>
                {byApi.has('ownerId') && <option value="mine">My {describe.data.object.pluralLabel.toLowerCase()}</option>}
              </Select>
              <ConditionBuilder
                fields={filterFields}
                conditions={def.filters}
                onChange={(c) => set({ filters: c })}
                logic={def.filterLogic || ''}
                onLogicChange={(l) => set({ filterLogic: l })}
                allowUserTokens
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Date filters accept TODAY, THIS_WEEK, THIS_MONTH, LAST_MONTH, THIS_QUARTER, THIS_YEAR, LAST_N_DAYS:30…
              </p>
            </Section>

            <Section title="Sort">
              <div className="flex gap-1">
                <Select value={def.sort?.field || ''} onChange={(e) => set({ sort: e.target.value ? { field: e.target.value, dir: def.sort?.dir || 'desc' } : null })}>
                  <option value="">Last modified</option>
                  {fields.map((f) => (
                    <option key={f.apiName} value={f.apiName}>
                      {f.label}
                    </option>
                  ))}
                </Select>
                <Select className="!w-24" value={def.sort?.dir || 'desc'} onChange={(e) => def.sort && set({ sort: { ...def.sort, dir: e.target.value as 'asc' | 'desc' } })} disabled={!def.sort}>
                  <option value="asc">A → Z</option>
                  <option value="desc">Z → A</option>
                </Select>
              </div>
            </Section>

            {def.format !== 'tabular' && (
              <Section title="Chart">
                <Select
                  className="mb-1"
                  value={def.chart?.type || 'none'}
                  onChange={(e) => set({ chart: e.target.value === 'none' ? null : { type: e.target.value as ChartType, aggregateIndex: def.chart?.aggregateIndex ?? -1 } })}
                >
                  {(Object.keys(CHART_LABELS) as ChartType[])
                    .filter((t) => t !== 'stackedColumn' || def.format === 'matrix')
                    .map((t) => (
                      <option key={t} value={t}>
                        {CHART_LABELS[t]}
                      </option>
                    ))}
                </Select>
                {def.chart && (
                  <Select value={def.chart.aggregateIndex ?? -1} onChange={(e) => set({ chart: { ...def.chart!, aggregateIndex: Number(e.target.value) } })}>
                    <option value={-1}>Value: Record count</option>
                    {def.aggregates.map((a, i) => (
                      <option key={i} value={i}>
                        Value: {AGG_LABELS[a.fn]} of {byApi.get(a.field)?.label || a.field}
                      </option>
                    ))}
                  </Select>
                )}
              </Section>
            )}
          </>
        )}
        <div className="flex gap-2">
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary" disabled={!def.objectApiName || !def.columns.length} onClick={() => setSaveOpen(true)}>
            {def._id ? 'Save' : 'Save report'}
          </Btn>
        </div>
      </aside>

      <section className="min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-[var(--p-text)]">{def.name || 'Untitled report'}</h2>
          <span className="text-xs text-gray-500">{running ? 'Updating preview…' : result ? 'Live preview' : ''}</span>
        </div>
        <ErrorBanner error={previewError} />
        {!def.objectApiName ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-lg p-10 text-center text-sm text-gray-500">Choose a module to start.</div>
        ) : describe.loading && !describe.data ? (
          <Loading />
        ) : def.format !== 'tabular' && !def.groupings.length ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-lg p-10 text-center text-sm text-gray-500">Choose a field to group by.</div>
        ) : def.format === 'matrix' && !def.columnGrouping ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-lg p-10 text-center text-sm text-gray-500">Choose a field to group columns by.</div>
        ) : result ? (
          <div className={running ? 'opacity-60 transition-opacity' : ''}>
            <ReportView def={def} result={result} fields={fields} />
          </div>
        ) : (
          <Loading label="Running report…" />
        )}
      </section>
      {saveOpen && <SaveModal def={def} saving={saving} onClose={() => setSaveOpen(false)} onSave={save} />}
    </div>
  );
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function SaveModal({
  def,
  saving,
  onClose,
  onSave,
}: {
  def: ReportDefinition;
  saving: boolean;
  onClose: () => void;
  onSave: (m: { name: string; description: string; folder: 'public' | 'private' }) => Promise<void>;
}) {
  const [name, setName] = useState(def.name);
  const [description, setDescription] = useState(def.description || '');
  const [folder, setFolder] = useState(def.folder);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal
      open
      onClose={onClose}
      title="Save Report"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            disabled={!name.trim() || saving}
            onClick={() => onSave({ name, description, folder }).catch((e) => setError((e as Error).message))}
          >
            {saving ? 'Saving…' : 'Save'}
          </Btn>
        </>
      }
    >
      <ErrorBanner error={error} />
      <FormField label="Report name" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </FormField>
      <FormField label="Description">
        <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
      <FormField label="Folder">
        <div className="space-y-1">
          <Checkbox checked={folder === 'private'} onChange={() => setFolder('private')} label="Private — only you" />
          <Checkbox checked={folder === 'public'} onChange={() => setFolder('public')} label="Public — everyone in the workspace (needs permission)" />
        </div>
      </FormField>
      <p className="text-xs text-gray-500">Everyone who runs a report only sees records and fields their own access allows.</p>
    </Modal>
  );
}
