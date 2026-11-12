'use client';

import { useMemo, useState } from 'react';
import { parseCsv, toCsv } from '@/lib/platform/csv';
import type { Condition, DescribeResponse, FieldDescribe, FieldError } from '@/lib/platform/types';
import {
  Badge,
  Btn,
  Checkbox,
  Empty,
  ErrorBanner,
  FormField,
  Loading,
  SectionTitle,
  Select,
  Table,
  Tabs,
  ThemeScope,
  api,
  td,
  th,
  useLoad,
  type PlatformTheme,
} from './ui';
import { ConditionBuilder } from './RuleEditors';

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type Operation = 'insert' | 'update' | 'upsert' | 'delete';
type JobOperation = Operation | 'export';

interface LoaderObject {
  apiName: string;
  label: string;
  pluralLabel: string;
  app: string;
  isCustom: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface ObjectsResponse {
  objects: LoaderObject[];
  canImport: boolean;
  canExport: boolean;
}

interface Job {
  _id: string;
  userId: string;
  userName?: string;
  objectApiName: string;
  objectLabel?: string;
  operation: JobOperation;
  fileName?: string;
  matchField?: string;
  total: number;
  succeeded: number;
  failed: number;
  status: 'running' | 'completed';
  createdAt: string;
}

interface RowResult {
  index: number;
  success: boolean;
  id?: string;
  created?: boolean;
  errors?: FieldError[];
}

const BATCH_SIZE = 200;
const MAX_IMPORT_ROWS = 50_000;
const ID_TARGET = '_id';

const OPERATIONS: { id: Operation; label: string; help: string }[] = [
  { id: 'insert', label: 'Insert', help: 'Create new records.' },
  { id: 'update', label: 'Update', help: 'Change existing records, found by Record ID or a match field.' },
  { id: 'upsert', label: 'Upsert', help: 'Update records that match, insert the rest.' },
  { id: 'delete', label: 'Delete', help: 'Delete records by Record ID.' },
];

const OP_LABEL: Record<JobOperation, string> = {
  insert: 'Insert',
  update: 'Update',
  upsert: 'Upsert',
  delete: 'Delete',
  export: 'Export',
};

function allowed(o: LoaderObject, op: Operation): boolean {
  switch (op) {
    case 'insert':
      return o.canCreate;
    case 'update':
      return o.canEdit;
    case 'upsert':
      return o.canCreate && o.canEdit;
    case 'delete':
      return o.canDelete;
  }
}

/** Normalise a header / label for auto-matching (case, spaces and punctuation-insensitive). */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const ID_ALIASES = new Set(['id', '_id', 'recordid']);

function download(name: string, content: string | Blob) {
  const blob = typeof content === 'string' ? new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function describeObject(apiName: string) {
  return api<DescribeResponse>(`/api/platform/describe/${encodeURIComponent(apiName)}`);
}

function fmtDate(s: string) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

function Notice({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'amber' }) {
  const cls = tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-200 bg-blue-50 text-blue-800';
  return <div className={`mb-3 rounded border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

type Tab = 'import' | 'export' | 'history';

export function DataLoader({ theme }: { theme?: PlatformTheme }) {
  const [tab, setTab] = useState<Tab>('import');
  const meta = useLoad(() => api<ObjectsResponse>('/api/platform/data-loader/objects'), []);

  return (
    <ThemeScope theme={theme}>
      <SectionTitle
        title="Data Loader"
        subtitle="Insert, update, upsert, delete and export records in bulk using CSV files. Permissions, field-level security and validation rules apply to every row."
      />
      <Tabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'import', label: 'Import' },
          { id: 'export', label: 'Export' },
          { id: 'history', label: 'History' },
        ]}
      />
      <div className="pt-5">
        {meta.loading && !meta.data ? (
          <Loading />
        ) : meta.error || !meta.data ? (
          <ErrorBanner error={meta.error || 'Could not load objects.'} />
        ) : (
          <>
            {tab === 'import' && <ImportWizard meta={meta.data} />}
            {tab === 'export' && <ExportPanel meta={meta.data} />}
            {tab === 'history' && <HistoryPanel />}
          </>
        )}
      </div>
    </ThemeScope>
  );
}

/* ------------------------------------------------------------------ */
/* Import wizard                                                       */
/* ------------------------------------------------------------------ */

type Step = 1 | 2 | 3 | 4 | 5;
const STEP_LABELS = ['Choose object', 'Choose file', 'Map fields', 'Review', 'Results'];

interface ParsedFile {
  name: string;
  headers: string[];
  rows: string[][];
}

function StepBar({ step }: { step: Step }) {
  return (
    <ol className="flex flex-wrap gap-2 mb-5 text-xs">
      {STEP_LABELS.map((l, i) => {
        const n = i + 1;
        const state = n < step ? 'done' : n === step ? 'current' : 'todo';
        return (
          <li
            key={l}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              state === 'current'
                ? 'border-[var(--p-accent)] bg-[var(--p-accent-bg)] text-[var(--p-accent)] font-medium'
                : state === 'done'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-500'
            }`}
          >
            <span>{state === 'done' ? '✓' : n}</span>
            {l}
          </li>
        );
      })}
    </ol>
  );
}

function ImportWizard({ meta }: { meta: ObjectsResponse }) {
  const [step, setStep] = useState<Step>(1);
  const [operation, setOperation] = useState<Operation>('insert');
  const [objectApi, setObjectApi] = useState('');
  const [describe, setDescribe] = useState<DescribeResponse | null>(null);
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<string[]>([]);
  const [matchField, setMatchField] = useState(ID_TARGET);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<RowResult[] | null>(null);

  const objects = meta.objects.filter((o) => allowed(o, operation));
  const object = meta.objects.find((o) => o.apiName === objectApi);

  const fields = useMemo(() => describe?.object.fields || [], [describe]);
  const byApi = useMemo(() => Object.fromEntries(fields.map((f) => [f.apiName, f])), [fields]);

  /** Fields a CSV column can be mapped to. */
  const targets = useMemo<FieldDescribe[]>(() => {
    if (!describe || operation === 'delete') return [];
    const editable = fields.filter((f) => f.type !== 'formula' && f.active !== false && describe.access.fields[f.apiName]?.edit);
    const extra = matchField !== ID_TARGET && byApi[matchField] && !editable.some((f) => f.apiName === matchField) ? [byApi[matchField]] : [];
    return [...editable, ...extra];
  }, [describe, fields, byApi, operation, matchField]);

  const matchOptions = useMemo(
    () =>
      fields.filter(
        (f) => f.type !== 'formula' && f.active !== false && (f.unique || ['text', 'email', 'phone', 'url'].includes(f.type)),
      ),
    [fields],
  );

  if (!meta.canImport) {
    return (
      <Notice tone="amber">
        You need the <b>Import Data</b> permission to insert, update, upsert or delete records with the Data Loader. Ask your administrator to
        add it to your profile or a permission set.
      </Notice>
    );
  }

  const reset = () => {
    setStep(1);
    setDescribe(null);
    setFile(null);
    setMapping([]);
    setMatchField(ID_TARGET);
    setResults(null);
    setProgress({ done: 0, total: 0 });
    setError(null);
  };

  /* ---- step 1 → 2 ---- */
  const chooseObject = async () => {
    if (!objectApi) return setError('Choose an object.');
    setBusy(true);
    setError(null);
    try {
      setDescribe(await describeObject(objectApi));
      setMatchField(ID_TARGET);
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /* ---- step 2: parse file ---- */
  const autoMap = (headers: string[], match: string, d: DescribeResponse | null): string[] => {
    const used = new Set<string>();
    const all = d?.object.fields || [];
    const editable = all.filter((f) => f.type !== 'formula' && f.active !== false && d?.access.fields[f.apiName]?.edit);
    const pool = operation === 'delete' ? [] : [...editable, ...(match !== ID_TARGET ? all.filter((f) => f.apiName === match) : [])];
    return headers.map((h) => {
      const n = norm(h);
      let target = '';
      if (ID_ALIASES.has(n) && operation !== 'insert') target = ID_TARGET;
      else {
        const f = pool.find((x) => norm(x.apiName) === n) || pool.find((x) => norm(x.label) === n);
        if (f) target = f.apiName;
      }
      if (!target || used.has(target)) return '';
      used.add(target);
      return target;
    });
  };

  const onFile = async (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') return setError('Choose a .csv file.');
    try {
      const all = parseCsv(await f.text());
      if (!all.length || all[0].every((h) => !h.trim())) return setError('The file is empty or has no header row.');
      const headers = all[0].map((h, i) => h.trim() || `Column ${i + 1}`);
      const rows = all.slice(1).filter((r) => r.some((c) => c.trim() !== ''));
      if (!rows.length) return setError('The file has a header row but no data rows.');
      if (rows.length > MAX_IMPORT_ROWS) return setError(`The file has ${rows.length.toLocaleString()} rows; the limit is ${MAX_IMPORT_ROWS.toLocaleString()}. Split it into smaller files.`);
      setFile({ name: f.name, headers, rows });
      setMapping(autoMap(headers, matchField, describe));
    } catch (e) {
      setError(`Could not read the file: ${(e as Error).message}`);
    }
  };

  /* ---- step 3: mapping ---- */
  const setColumn = (col: number, target: string) =>
    setMapping((m) => m.map((t, i) => (i === col ? target : t === target && target ? '' : t)));

  const changeMatchField = (api: string) => {
    setMatchField(api);
    if (!file || mapping.includes(api)) return;
    const f = byApi[api];
    const col = file.headers.findIndex((h) => (api === ID_TARGET ? ID_ALIASES.has(norm(h)) : norm(h) === norm(api) || (f && norm(h) === norm(f.label))));
    if (col >= 0) setColumn(col, api);
  };

  const mapped = new Set(mapping.filter(Boolean));
  const missingRequired =
    operation === 'insert' || operation === 'upsert'
      ? fields.filter(
          (f) =>
            f.required &&
            !f.isSystem &&
            f.type !== 'formula' &&
            f.type !== 'checkbox' &&
            (f.defaultValue === undefined || f.defaultValue === null || f.defaultValue === '') &&
            !f.picklistValues?.some((p) => p.isDefault) &&
            !mapped.has(f.apiName),
        )
      : [];

  const mappingProblem = (): string | null => {
    if (!mapped.size) return 'Map at least one column.';
    if (operation === 'delete' && !mapped.has(ID_TARGET)) return 'Map a column to Record ID (_id) to delete records.';
    if (operation === 'update' && !mapped.has(matchField)) return `Map a column to ${matchField === ID_TARGET ? 'Record ID (_id)' : byApi[matchField]?.label || matchField} to find the records to update.`;
    if (operation === 'upsert' && matchField !== ID_TARGET && !mapped.has(matchField)) return `Map a column to the match field ${byApi[matchField]?.label || matchField}.`;
    return null; // unmapped required fields are a warning only
  };

  const fieldLabel = (api: string) => (api === ID_TARGET ? 'Record ID' : byApi[api]?.label || api);

  /* ---- step 4 → 5: run ---- */
  const run = async () => {
    if (!file || !object) return;
    setBusy(true);
    setError(null);
    const total = file.rows.length;
    const out: RowResult[] = new Array(total);
    setProgress({ done: 0, total });
    setResults(null);
    setStep(5);
    let jobId: string | null = null;
    try {
      const job = await api<Job>('/api/platform/data-loader/jobs', {
        body: {
          objectApiName: object.apiName,
          operation,
          fileName: file.name,
          matchField: operation === 'update' || operation === 'upsert' ? matchField : undefined,
          total,
        },
      });
      jobId = job._id;
      for (let start = 0; start < total; start += BATCH_SIZE) {
        const chunk = file.rows.slice(start, start + BATCH_SIZE).map((cells) => {
          const row: Record<string, string> = {};
          mapping.forEach((target, col) => {
            if (target) row[target] = cells[col] ?? '';
          });
          return row;
        });
        try {
          const res = await api<{ results: RowResult[] }>(`/api/platform/data-loader/jobs/${jobId}/batch`, { body: { rows: chunk } });
          for (const r of res.results) out[start + r.index] = { ...r, index: start + r.index };
        } catch (e) {
          chunk.forEach((_, i) => {
            out[start + i] = { index: start + i, success: false, errors: [{ message: (e as Error).message }] };
          });
        }
        for (let i = start; i < Math.min(start + BATCH_SIZE, total); i++) {
          if (!out[i]) out[i] = { index: i, success: false, errors: [{ message: 'No result returned for this row.' }] };
        }
        setProgress({ done: Math.min(start + BATCH_SIZE, total), total });
      }
    } catch (e) {
      setError((e as Error).message);
      if (!jobId) {
        setStep(4);
        setBusy(false);
        return;
      }
    }
    if (jobId) {
      try {
        await api(`/api/platform/data-loader/jobs/${jobId}`, { method: 'PATCH', body: { status: 'completed' } });
      } catch {
        /* history only */
      }
    }
    setResults(Array.from({ length: total }, (_, i) => out[i] || { index: i, success: false, errors: [{ message: 'Not processed.' }] }));
    setBusy(false);
  };

  const errorText = (r: RowResult) =>
    (r.errors || []).map((e) => (e.field ? `${fieldLabel(e.field)}: ${e.message}` : e.message)).join('; ') || 'Unknown error';

  const downloadSuccess = () => {
    if (!file || !results) return;
    const rows = results
      .filter((r) => r.success)
      .map((r) => [
        ...file.headers.map((_, c) => file.rows[r.index][c] ?? ''),
        r.id || '',
        operation === 'delete' ? 'Deleted' : r.created ? 'Created' : 'Updated',
      ]);
    download('success.csv', toCsv(rows, [...file.headers, 'Id', 'Status']));
  };

  const downloadErrors = () => {
    if (!file || !results) return;
    const rows = results.filter((r) => !r.success).map((r) => [...file.headers.map((_, c) => file.rows[r.index][c] ?? ''), errorText(r)]);
    download('errors.csv', toCsv(rows, [...file.headers, 'Error']));
  };

  const succeeded = results?.filter((r) => r.success).length || 0;
  const failed = results ? results.length - succeeded : 0;
  const created = results?.filter((r) => r.success && r.created).length || 0;

  return (
    <div className="bg-white border border-[var(--p-border)] rounded p-5">
      <StepBar step={step} />
      <ErrorBanner error={error} />

      {step === 1 && (
        <div className="max-w-2xl">
          <FormField label="What do you want to do?">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {OPERATIONS.map((op) => (
                <label
                  key={op.id}
                  className={`flex gap-2 items-start border rounded p-3 cursor-pointer ${
                    operation === op.id ? 'border-[var(--p-accent)] bg-[var(--p-accent-bg)]' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="dl-op"
                    className="mt-0.5 accent-[var(--p-accent)]"
                    checked={operation === op.id}
                    onChange={() => {
                      setOperation(op.id);
                      const o = meta.objects.find((x) => x.apiName === objectApi);
                      if (o && !allowed(o, op.id)) setObjectApi('');
                    }}
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">{op.label}</span>
                    <span className="block text-xs text-gray-500">{op.help}</span>
                  </span>
                </label>
              ))}
            </div>
          </FormField>
          <FormField label="Object" help="Only objects connected to the platform that you have permission to change are listed.">
            <Select value={objectApi} onChange={(e) => setObjectApi(e.target.value)}>
              <option value="">— Choose an object —</option>
              {objects.map((o) => (
                <option key={o.apiName} value={o.apiName}>
                  {o.label} ({o.apiName})
                </option>
              ))}
            </Select>
            {!objects.length && <div className="text-xs text-gray-500 mt-1">You can&apos;t {operation} records in any connected object.</div>}
          </FormField>
          <div className="flex justify-end">
            <Btn variant="primary" disabled={!objectApi || busy} onClick={chooseObject}>
              {busy ? 'Loading…' : 'Next'}
            </Btn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            {OP_LABEL[operation]} <b>{object?.pluralLabel}</b>. Choose a comma-separated (.csv) file whose first row contains column headers.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="block text-sm text-gray-700 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border file:border-[var(--p-border)] file:bg-white file:text-sm file:text-gray-700 hover:file:bg-gray-50"
          />
          <ImportTips operation={operation} />
          {file && (
            <div className="mt-4">
              <div className="text-sm text-gray-700 mb-2">
                <b>{file.name}</b> — {file.rows.length.toLocaleString()} row{file.rows.length === 1 ? '' : 's'}, {file.headers.length} column
                {file.headers.length === 1 ? '' : 's'}. First {Math.min(5, file.rows.length)} rows:
              </div>
              <Table
                head={
                  <tr>
                    {file.headers.map((h, i) => (
                      <th key={i} className={th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                }
              >
                {file.rows.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    {file.headers.map((_, c) => (
                      <td key={c} className={`${td} max-w-[16rem] truncate`} title={r[c]}>
                        {r[c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </Table>
            </div>
          )}
          <div className="flex justify-between mt-4">
            <Btn onClick={() => setStep(1)}>Back</Btn>
            <Btn variant="primary" disabled={!file} onClick={() => setStep(3)}>
              Next
            </Btn>
          </div>
        </div>
      )}

      {step === 3 && file && (
        <div>
          {(operation === 'update' || operation === 'upsert') && (
            <FormField
              label="Match records by"
              help={
                operation === 'upsert'
                  ? 'Rows that match one record update it; rows with no match are inserted; rows matching several records fail.'
                  : 'Rows are matched to existing records by this field. When the cell is blank, the Record ID column is used if mapped.'
              }
              className="max-w-md"
            >
              <Select value={matchField} onChange={(e) => changeMatchField(e.target.value)}>
                <option value={ID_TARGET}>Record ID (_id)</option>
                {matchOptions.map((f) => (
                  <option key={f.apiName} value={f.apiName}>
                    {f.label} ({f.apiName}){f.unique ? ' — unique' : ''}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          {operation === 'delete' && <Notice>Only the Record ID column is used to delete records; other columns are ignored.</Notice>}
          {missingRequired.length > 0 && (
            <Notice tone="amber">
              Required field{missingRequired.length === 1 ? '' : 's'} not mapped: <b>{missingRequired.map((f) => f.label).join(', ')}</b>.{' '}
              {operation === 'insert' ? 'New records will fail unless these are mapped.' : 'Rows that insert new records will fail unless these are mapped.'}
            </Notice>
          )}
          <Table
            head={
              <tr>
                <th className={th}>CSV column</th>
                <th className={th}>Sample value</th>
                <th className={th}>Target field</th>
              </tr>
            }
          >
            {file.headers.map((h, col) => {
              const sample = file.rows.find((r) => (r[col] ?? '').trim() !== '')?.[col] ?? '';
              return (
                <tr key={col}>
                  <td className={`${td} font-medium text-gray-900`}>{h}</td>
                  <td className={`${td} text-gray-500 max-w-[16rem] truncate`} title={sample}>
                    {sample}
                  </td>
                  <td className={`${td} w-80`}>
                    <Select value={mapping[col] || ''} onChange={(e) => setColumn(col, e.target.value)}>
                      <option value="">— Don&apos;t import —</option>
                      {operation !== 'insert' && <option value={ID_TARGET}>Record ID (_id)</option>}
                      {targets.map((f) => (
                        <option key={f.apiName} value={f.apiName}>
                          {f.required ? '* ' : ''}
                          {f.label} ({f.apiName})
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              );
            })}
          </Table>
          <p className="text-xs text-gray-500 mt-2">* required field. Each field can be mapped to one column.</p>
          <div className="flex justify-between mt-4">
            <Btn onClick={() => setStep(2)}>Back</Btn>
            <Btn
              variant="primary"
              onClick={() => {
                const p = mappingProblem();
                if (p) return setError(p);
                setError(null);
                setStep(4);
              }}
            >
              Next
            </Btn>
          </div>
        </div>
      )}

      {step === 4 && file && object && (
        <div className="max-w-2xl">
          <dl className="grid grid-cols-[10rem_1fr] gap-y-2 text-sm mb-4">
            <dt className="text-gray-500">Operation</dt>
            <dd className="font-medium">{OP_LABEL[operation]}</dd>
            <dt className="text-gray-500">Object</dt>
            <dd className="font-medium">
              {object.pluralLabel} <span className="text-gray-400">({object.apiName})</span>
            </dd>
            <dt className="text-gray-500">File</dt>
            <dd>
              {file.name} — {file.rows.length.toLocaleString()} rows ({Math.ceil(file.rows.length / BATCH_SIZE)} batch
              {Math.ceil(file.rows.length / BATCH_SIZE) === 1 ? '' : 'es'} of up to {BATCH_SIZE})
            </dd>
            {(operation === 'update' || operation === 'upsert') && (
              <>
                <dt className="text-gray-500">Match by</dt>
                <dd>{fieldLabel(matchField)}</dd>
              </>
            )}
            <dt className="text-gray-500">Mapped fields</dt>
            <dd>
              {mapping
                .map((t, col) => (t ? `${file.headers[col]} → ${fieldLabel(t)}` : ''))
                .filter(Boolean)
                .join(', ')}
            </dd>
            {mapping.some((t) => !t) && (
              <>
                <dt className="text-gray-500">Skipped columns</dt>
                <dd className="text-gray-500">{file.headers.filter((_, c) => !mapping[c]).join(', ')}</dd>
              </>
            )}
          </dl>
          {operation === 'delete' && (
            <Notice tone="amber">
              Deleting records can&apos;t be undone. {file.rows.length.toLocaleString()} record{file.rows.length === 1 ? '' : 's'} will be deleted.
            </Notice>
          )}
          {missingRequired.length > 0 && (
            <Notice tone="amber">Not mapped (required): {missingRequired.map((f) => f.label).join(', ')}</Notice>
          )}
          <div className="flex justify-between">
            <Btn onClick={() => setStep(3)}>Back</Btn>
            <Btn variant={operation === 'delete' ? 'danger' : 'primary'} disabled={busy} onClick={run}>
              Run {OP_LABEL[operation].toLowerCase()}
            </Btn>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="max-w-2xl">
          <div className="text-sm text-gray-700 mb-1">
            {busy ? 'Processing…' : 'Finished.'} {progress.done.toLocaleString()} of {progress.total.toLocaleString()} rows
          </div>
          <div className="h-2.5 w-full bg-gray-100 rounded overflow-hidden mb-4">
            <div
              className="h-full bg-[var(--p-accent)] transition-all"
              style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
            />
          </div>
          {busy && <p className="text-xs text-gray-500">Keep this page open until the load finishes.</p>}
          {results && (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex-1 min-w-[10rem] rounded border border-green-200 bg-green-50 px-4 py-3">
                  <div className="text-2xl font-semibold text-green-700">{succeeded.toLocaleString()}</div>
                  <div className="text-xs text-green-800">
                    succeeded
                    {operation === 'upsert' && succeeded > 0 ? ` (${created} inserted, ${succeeded - created} updated)` : ''}
                  </div>
                </div>
                <div className={`flex-1 min-w-[10rem] rounded border px-4 py-3 ${failed ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className={`text-2xl font-semibold ${failed ? 'text-red-700' : 'text-gray-500'}`}>{failed.toLocaleString()}</div>
                  <div className={`text-xs ${failed ? 'text-red-800' : 'text-gray-500'}`}>failed</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Btn disabled={!succeeded} onClick={downloadSuccess}>
                  Download success.csv
                </Btn>
                <Btn disabled={!failed} onClick={downloadErrors}>
                  Download errors.csv
                </Btn>
                <Btn variant="primary" onClick={reset}>
                  Start a new load
                </Btn>
              </div>
              {failed > 0 && (
                <>
                  <div className="text-xs font-medium text-gray-600 mb-1">First errors</div>
                  <Table
                    head={
                      <tr>
                        <th className={th}>Row</th>
                        <th className={th}>Error</th>
                      </tr>
                    }
                  >
                    {results
                      .filter((r) => !r.success)
                      .slice(0, 10)
                      .map((r) => (
                        <tr key={r.index}>
                          <td className={`${td} w-16 text-gray-500`}>{r.index + 2}</td>
                          <td className={`${td} text-red-700`}>{errorText(r)}</td>
                        </tr>
                      ))}
                  </Table>
                  <p className="text-xs text-gray-500 mt-1">Row numbers count the header as row 1.</p>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ImportTips({ operation }: { operation: Operation }) {
  return (
    <div className="mt-4 rounded border border-[var(--p-border)] bg-gray-50 px-4 py-3 text-xs text-gray-600">
      <div className="font-medium text-gray-700 mb-1">Formatting tips</div>
      <ul className="list-disc pl-4 space-y-0.5">
        <li>The first row must contain column headers. Columns named like a field&apos;s API name or label are mapped automatically.</li>
        {operation !== 'insert' && <li>Record IDs go in a column called <code>Id</code> or <code>_id</code> (export the object first to get them).</li>}
        <li>Lookup fields take record IDs, not names.</li>
        <li>Dates: <code>YYYY-MM-DD</code>. Date/times: ISO 8601, e.g. <code>2025-03-31T14:30:00Z</code>.</li>
        <li>Checkboxes: <code>true</code> / <code>false</code> (also yes/no, 1/0).</li>
        <li>Multi-select picklists: separate values with <code>;</code>, e.g. <code>Red;Blue</code>.</li>
        <li>Numbers without currency symbols; commas as thousands separators are ignored.</li>
        {operation !== 'insert' && (
          <li>
            Blank cells leave the field unchanged. To clear a field, enter <code>#N/A</code>.
          </li>
        )}
        <li>Up to {MAX_IMPORT_ROWS.toLocaleString()} rows per file, sent in batches of {BATCH_SIZE}. A bad row never stops the rest.</li>
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

function ExportPanel({ meta }: { meta: ObjectsResponse }) {
  const [objectApi, setObjectApi] = useState('');
  const desc = useLoad(() => (objectApi ? describeObject(objectApi) : Promise.resolve(null)), [objectApi]);
  /** null = default selection (Record ID + all non-system fields). */
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [filters, setFilters] = useState<Condition[]>([]);
  const [logic, setLogic] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const fields = useMemo(() => desc.data?.object.fields.filter((f) => f.active !== false) || [], [desc.data]);
  const defaults = useMemo(() => new Set([ID_TARGET, ...fields.filter((f) => !f.isSystem).map((f) => f.apiName)]), [fields]);
  const chosen = selected ?? defaults;
  const filterFields = useMemo(() => fields.filter((f) => f.type !== 'formula'), [fields]);

  if (!meta.canExport) {
    return (
      <Notice tone="amber">
        You need the <b>Export Data</b> permission to export records. Ask your administrator to add it to your profile or a permission set.
      </Notice>
    );
  }

  const toggle = (api: string, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(api);
    else next.delete(api);
    setSelected(next);
  };

  const runExport = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const order = [ID_TARGET, ...fields.map((f) => f.apiName)].filter((a) => chosen.has(a));
      const res = await fetch('/api/platform/data-loader/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectApiName: objectApi,
          fields: order,
          filters: filters.filter((c) => c.field),
          filterLogic: logic || undefined,
        }),
      });
      if (!res.ok) {
        let msg = `Export failed (${res.status})`;
        try {
          const d = (await res.json()) as { error?: string };
          if (d.error) msg = d.error;
        } catch {
          /* not JSON */
        }
        throw new Error(msg);
      }
      const cd = res.headers.get('Content-Disposition') || '';
      const name = /filename="?([^";]+)"?/i.exec(cd)?.[1] || `${objectApi}-export.csv`;
      const count = Number(res.headers.get('X-Row-Count') || 0);
      download(name, await res.blob());
      setDone(
        `Exported ${count.toLocaleString()} record${count === 1 ? '' : 's'} to ${name}.` +
          (res.headers.get('X-Truncated') === 'true' ? ' Only the first 50,000 records were exported — add filters to export the rest.' : ''),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-[var(--p-border)] rounded p-5">
      <ErrorBanner error={error} />
      {done && <Notice>{done}</Notice>}
      <FormField label="Object" className="max-w-md">
        <Select
          value={objectApi}
          onChange={(e) => {
            setObjectApi(e.target.value);
            setSelected(null);
            setFilters([]);
            setLogic('');
            setDone(null);
          }}
        >
          <option value="">— Choose an object —</option>
          {meta.objects.map((o) => (
            <option key={o.apiName} value={o.apiName}>
              {o.label} ({o.apiName})
            </option>
          ))}
        </Select>
      </FormField>

      {objectApi && desc.loading && <Loading />}
      {objectApi && desc.error && <ErrorBanner error={desc.error} />}
      {objectApi && desc.data && (
        <>
          <div className="flex items-center justify-between mt-2 mb-2">
            <div className="text-xs font-medium text-gray-700">
              Fields <span className="text-gray-400">({chosen.size} selected)</span>
            </div>
            <div className="flex gap-1">
              <Btn size="sm" variant="ghost" onClick={() => setSelected(new Set([ID_TARGET, ...fields.map((f) => f.apiName)]))}>
                Select all
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Select none
              </Btn>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5 border border-[var(--p-border)] rounded p-3 max-h-72 overflow-y-auto mb-4">
            <Checkbox checked={chosen.has(ID_TARGET)} onChange={(v) => toggle(ID_TARGET, v)} label={<span>Record ID <span className="text-gray-400">(_id)</span></span>} />
            {fields.map((f) => (
              <Checkbox
                key={f.apiName}
                checked={chosen.has(f.apiName)}
                onChange={(v) => toggle(f.apiName, v)}
                label={
                  <span>
                    {f.label} <span className="text-gray-400">({f.apiName})</span>
                    {f.isSystem && <span className="ml-1"><Badge>system</Badge></span>}
                  </span>
                }
              />
            ))}
          </div>

          <div className="text-xs font-medium text-gray-700 mb-2">Filters (optional)</div>
          <div className="mb-4">
            <ConditionBuilder
              key={objectApi}
              fields={filterFields}
              conditions={filters}
              onChange={setFilters}
              logic={logic}
              onLogicChange={setLogic}
              allowUserTokens
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Exports up to 50,000 records you can see. Dates are exported as <code>YYYY-MM-DD</code> / ISO 8601, multi-select values separated by{' '}
              <code>;</code>.
            </p>
            <Btn variant="primary" disabled={busy || chosen.size === 0} onClick={runExport}>
              {busy ? 'Exporting…' : 'Export'}
            </Btn>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

function HistoryPanel() {
  const jobs = useLoad(() => api<Job[]>('/api/platform/data-loader/jobs'), []);
  if (jobs.loading && !jobs.data) return <Loading />;
  if (jobs.error) return <ErrorBanner error={jobs.error} />;
  const list = jobs.data || [];
  return (
    <div>
      <div className="flex justify-end mb-2">
        <Btn size="sm" onClick={() => jobs.reload()}>
          Refresh
        </Btn>
      </div>
      {!list.length ? (
        <Empty>No Data Loader jobs yet.</Empty>
      ) : (
        <Table
          head={
            <tr>
              <th className={th}>When</th>
              <th className={th}>User</th>
              <th className={th}>Object</th>
              <th className={th}>Operation</th>
              <th className={th}>File</th>
              <th className={`${th} text-right`}>Total</th>
              <th className={`${th} text-right`}>Succeeded</th>
              <th className={`${th} text-right`}>Failed</th>
              <th className={th}>Status</th>
            </tr>
          }
        >
          {list.map((j) => (
            <tr key={j._id}>
              <td className={`${td} whitespace-nowrap`}>{fmtDate(j.createdAt)}</td>
              <td className={td}>{j.userName || j.userId}</td>
              <td className={td}>
                {j.objectLabel || j.objectApiName}
                {j.objectLabel && <div className="text-[11px] text-gray-400">{j.objectApiName}</div>}
              </td>
              <td className={td}>
                <Badge tone={j.operation === 'delete' ? 'red' : j.operation === 'export' ? 'blue' : 'accent'}>{OP_LABEL[j.operation] || j.operation}</Badge>
                {j.matchField && j.matchField !== ID_TARGET && <div className="text-[11px] text-gray-400">match: {j.matchField}</div>}
              </td>
              <td className={`${td} max-w-[14rem] truncate`} title={j.fileName}>
                {j.fileName || '—'}
              </td>
              <td className={`${td} text-right`}>{j.total.toLocaleString()}</td>
              <td className={`${td} text-right text-green-700`}>{j.succeeded.toLocaleString()}</td>
              <td className={`${td} text-right ${j.failed ? 'text-red-700' : 'text-gray-400'}`}>{j.failed.toLocaleString()}</td>
              <td className={td}>
                <Badge tone={j.status === 'completed' ? 'green' : 'amber'}>{j.status === 'completed' ? 'Completed' : 'Running'}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
