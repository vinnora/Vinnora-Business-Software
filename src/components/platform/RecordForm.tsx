'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DescribeResponse, FieldDescribe, FieldError, LayoutSection } from '@/lib/platform/types';
import { ApiError, Btn, ErrorBanner, Loading, Modal, api, useLoad } from './ui';

type Rec = Record<string, unknown>;

export function useDescribe(object: string) {
  return useLoad(() => api<DescribeResponse>(`/api/platform/describe/${object}`), [object]);
}

function isBlank(v: unknown) {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

/* ------------------------------------------------------------------ */
/* Value formatting                                                    */
/* ------------------------------------------------------------------ */

export function formatValue(f: FieldDescribe | undefined, v: unknown): string {
  if (isBlank(v)) return '';
  const type = f?.type === 'formula' ? f.returnType || 'text' : f?.type;
  switch (type) {
    case 'currency':
      return `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: f?.scale ?? 2 })}`;
    case 'percent':
      return `${Number(v).toLocaleString('en-IN', { maximumFractionDigits: f?.scale ?? 2 })}%`;
    case 'number':
      return Number(v).toLocaleString('en-IN', { maximumFractionDigits: f?.scale ?? 4 });
    case 'date': {
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { timeZone: 'UTC' });
    }
    case 'datetime': {
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-IN');
    }
    case 'checkbox':
      return v === true || v === 'true' ? '✓' : '✗';
    case 'multipicklist':
      return (Array.isArray(v) ? v : String(v).split(';')).map((x) => f?.picklistValues?.find((p) => p.value === x)?.label || x).join(', ');
    case 'picklist':
      return f?.picklistValues?.find((p) => p.value === v)?.label || String(v);
    default:
      return String(v);
  }
}

const lookupNameCache = new Map<string, Promise<string>>();

function lookupName(object: string, id: string): Promise<string> {
  const key = `${object}:${id}`;
  let p = lookupNameCache.get(key);
  if (!p) {
    p = api<{ _id: string; name: string }[]>(`/api/platform/records/${object}?mode=lookup&limit=1&search=${encodeURIComponent(id)}`)
      .then((r) => r.find((x) => x._id === id)?.name || id)
      .catch(() => id);
    lookupNameCache.set(key, p);
  }
  return p;
}

function LookupName({ object, id, fallback }: { object: string; id: string; fallback?: string }) {
  const [name, setName] = useState(fallback || '');
  useEffect(() => {
    if (fallback) return;
    let live = true;
    lookupName(object, id).then((n) => live && setName(n));
    return () => {
      live = false;
    };
  }, [object, id, fallback]);
  return <span>{name || '…'}</span>;
}

/** Read-only value display, resolving lookups to record names. */
export function FieldValue({ field, record }: { field: FieldDescribe; record: Rec }) {
  const v = record[field.apiName];
  if (isBlank(v)) return <span className="text-gray-400">—</span>;
  if (field.type === 'lookup' && field.referenceTo) {
    const nameKey = field.apiName.replace(/Id$/, 'Name');
    const fallback = nameKey !== field.apiName && typeof record[nameKey] === 'string' ? (record[nameKey] as string) : undefined;
    return <LookupName object={field.referenceTo} id={String(v)} fallback={fallback} />;
  }
  if (field.type === 'url') {
    const href = /^https?:\/\//.test(String(v)) ? String(v) : `https://${v}`;
    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-[var(--p-accent)] hover:underline break-all">
        {String(v)}
      </a>
    );
  }
  if (field.type === 'email') {
    return (
      <a href={`mailto:${v}`} className="text-[var(--p-accent)] hover:underline break-all">
        {String(v)}
      </a>
    );
  }
  return <span className="whitespace-pre-wrap break-words">{formatValue(field, v)}</span>;
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

const inputCls =
  'w-full px-3 py-1.5 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-[var(--p-accent)] focus:border-[var(--p-accent)]';

function LookupInput({
  field,
  value,
  display,
  onChange,
  invalid,
}: {
  field: FieldDescribe;
  value: unknown;
  display?: string;
  onChange: (id: string, name: string) => void;
  invalid?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<{ _id: string; name: string }[]>([]);
  const [label, setLabel] = useState(display || '');
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value && !display && field.referenceTo) lookupName(field.referenceTo, String(value)).then(setLabel);
  }, [value, display, field.referenceTo]);

  const search = (q: string) => {
    setQuery(q);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        setError(null);
        setOptions(await api(`/api/platform/records/${field.referenceTo}?mode=lookup&limit=20&search=${encodeURIComponent(q)}`));
      } catch (e) {
        setError((e as Error).message);
        setOptions([]);
      }
    }, 250);
  };

  if (value) {
    return (
      <div className={`${inputCls} flex items-center justify-between ${invalid ? 'border-red-400' : 'border-gray-300'}`}>
        <span className="truncate">{display || label || '…'}</span>
        <button type="button" onClick={() => onChange('', '')} className="text-gray-400 hover:text-gray-700 ml-2" aria-label="Clear">
          ×
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input
        className={`${inputCls} ${invalid ? 'border-red-400' : 'border-gray-300'}`}
        placeholder={`Search ${field.referenceTo}…`}
        value={query}
        onFocus={() => search(query)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => search(e.target.value)}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded shadow-lg">
          {error && <div className="px-3 py-2 text-xs text-red-600">{error}</div>}
          {!error && options.length === 0 && <div className="px-3 py-2 text-xs text-gray-500">No matches</div>}
          {options.map((o) => (
            <button
              key={o._id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setLabel(o.name);
                setQuery('');
                setOpen(false);
                onChange(o._id, o.name);
              }}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--p-accent-bg)]"
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function toInputDate(v: unknown, withTime: boolean): string {
  if (isBlank(v)) return '';
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return '';
  if (!withTime) return d.toISOString().slice(0, 10);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function FieldInput({
  field,
  value,
  record,
  onChange,
  onLookup,
  invalid,
}: {
  field: FieldDescribe;
  value: unknown;
  record: Rec;
  onChange: (v: unknown) => void;
  onLookup: (id: string, name: string) => void;
  invalid?: boolean;
}) {
  const cls = `${inputCls} ${invalid ? 'border-red-400' : 'border-gray-300'}`;
  const id = `f-${field.apiName}`;
  switch (field.type) {
    case 'textarea':
      return <textarea id={id} rows={3} className={cls} value={String(value ?? '')} maxLength={field.length} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
    case 'currency':
    case 'percent':
      return (
        <input
          id={id}
          type="number"
          className={cls}
          step={field.scale ? 1 / 10 ** field.scale : field.type === 'number' ? 1 : 0.01}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? '' : e.target.value)}
        />
      );
    case 'date':
      return <input id={id} type="date" className={cls} value={toInputDate(value, false)} onChange={(e) => onChange(e.target.value)} />;
    case 'datetime':
      return (
        <input
          id={id}
          type="datetime-local"
          className={cls}
          value={toInputDate(value, true)}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
        />
      );
    case 'checkbox':
      return (
        <input
          id={id}
          type="checkbox"
          className="h-4 w-4 mt-2 accent-[var(--p-accent)]"
          checked={value === true || value === 'true'}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case 'picklist': {
      const opts = (field.picklistValues || []).filter((p) => p.active !== false || p.value === value);
      return (
        <select id={id} className={cls} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          <option value="">—None—</option>
          {opts.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label || p.value}
            </option>
          ))}
        </select>
      );
    }
    case 'multipicklist': {
      const selected = Array.isArray(value) ? value.map(String) : isBlank(value) ? [] : String(value).split(';');
      return (
        <div className={`${cls} flex flex-wrap gap-x-4 gap-y-1`}>
          {(field.picklistValues || [])
            .filter((p) => p.active !== false || selected.includes(p.value))
            .map((p) => (
              <label key={p.value} className="inline-flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  className="accent-[var(--p-accent)]"
                  checked={selected.includes(p.value)}
                  onChange={(e) => onChange(e.target.checked ? [...selected, p.value] : selected.filter((x) => x !== p.value))}
                />
                {p.label || p.value}
              </label>
            ))}
        </div>
      );
    }
    case 'lookup': {
      const nameKey = field.apiName.replace(/Id$/, 'Name');
      const display = nameKey !== field.apiName && typeof record[nameKey] === 'string' ? (record[nameKey] as string) : undefined;
      return field.referenceTo ? (
        <LookupInput field={field} value={value} display={display} onChange={onLookup} invalid={invalid} />
      ) : (
        <input id={id} className={cls} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      );
    }
    default:
      return (
        <input
          id={id}
          type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'phone' ? 'tel' : 'text'}
          className={cls}
          value={String(value ?? '')}
          maxLength={field.length}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/* ------------------------------------------------------------------ */
/* Form                                                                */
/* ------------------------------------------------------------------ */

function initialValues(d: DescribeResponse, record?: Rec, defaults?: Rec): Rec {
  if (record) return { ...record };
  const v: Rec = {};
  for (const f of d.object.fields) {
    if (f.isSystem || f.type === 'formula') continue;
    const pickDefault = f.picklistValues?.find((p) => p.isDefault && p.active !== false)?.value;
    if (pickDefault !== undefined) v[f.apiName] = f.type === 'multipicklist' ? [pickDefault] : pickDefault;
    else if (f.defaultValue !== undefined && f.defaultValue !== null) {
      v[f.apiName] = f.type === 'date' && typeof f.defaultValue === 'string' ? f.defaultValue : f.defaultValue;
    }
  }
  return { ...v, ...(defaults || {}) };
}

function visibleSections(d: DescribeResponse, isNew: boolean): LayoutSection[] {
  return d.layout.sections.filter((s) => !(isNew && s.hideOnCreate));
}

export interface RecordFormProps {
  describe: DescribeResponse;
  record?: Rec;
  defaults?: Rec;
  /** Persist the payload; throw ApiError for validation errors. */
  submit: (payload: Rec, isNew: boolean) => Promise<Rec>;
  onSaved: (record: Rec) => void;
  onCancel: () => void;
}

/** Layout-driven form body + buttons (place inside a Modal or page). */
export function RecordFormBody({ describe: d, record, defaults, submit, onSaved, onCancel }: RecordFormProps) {
  const isNew = !record?._id;
  const [values, setValues] = useState<Rec>(() => initialValues(d, record, defaults));
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const byApi = useMemo(() => new Map(d.object.fields.map((f) => [f.apiName, f])), [d.object.fields]);
  const sections = visibleSections(d, isNew);

  const set = (k: string, v: unknown) => {
    setValues((cur) => ({ ...cur, [k]: v }));
    setErrors((cur) => cur.filter((e) => e.field !== k));
  };

  const save = async () => {
    setError(null);
    // Layout-level required fields are enforced by the form (like Salesforce).
    const missing: FieldError[] = [];
    for (const s of sections)
      for (const it of s.items) {
        if (it.behavior === 'required' && isBlank(values[it.field]) && byApi.get(it.field)?.type !== 'checkbox') {
          missing.push({ field: it.field, message: `${byApi.get(it.field)?.label || it.field} is required.` });
        }
      }
    if (missing.length) {
      setErrors(missing);
      return;
    }

    // Send editable fields; for edits only what changed.
    const payload: Rec = {};
    for (const f of d.object.fields) {
      const fp = d.access.fields[f.apiName];
      if (!fp?.edit && !f.appWritable) continue;
      if (!(f.apiName in values)) continue;
      const v = values[f.apiName];
      if (isNew) {
        if (!isBlank(v)) payload[f.apiName] = v;
      } else if (JSON.stringify(v ?? null) !== JSON.stringify(record?.[f.apiName] ?? null)) {
        payload[f.apiName] = v;
      }
    }

    setSaving(true);
    try {
      const saved = await submit(payload, isNew);
      onSaved(saved);
    } catch (e) {
      if (e instanceof ApiError && e.errors.length) {
        setErrors(e.errors);
        if (!e.errors.some((x) => !x.field)) setError('Review the errors on this page.');
      } else {
        setError((e as Error).message);
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (api: string) => errors.find((e) => e.field === api)?.message;
  const general = errors.filter((e) => !e.field || !sections.some((s) => s.items.some((i) => i.field === e.field)));

  return (
    <div>
      <ErrorBanner error={error} errors={general.map((e) => ({ message: e.message }))} />
      {sections.map((s) => (
        <div key={s.id} className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 bg-gray-50 border-b border-gray-200 px-2 py-1.5 mb-3 rounded-t">
            {s.label}
          </h3>
          <div className={`grid gap-x-5 ${s.columns === 2 ? 'sm:grid-cols-2' : ''}`}>
            {s.items.map((it) => {
              const f = byApi.get(it.field);
              if (!f) return null;
              const readonly = it.behavior === 'readonly' || f.isSystem || f.type === 'formula' || !d.access.fields[f.apiName]?.edit;
              const err = fieldError(f.apiName);
              return (
                <div key={f.apiName} className="mb-3 min-w-0">
                  <label htmlFor={`f-${f.apiName}`} className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                    {it.behavior === 'required' && !readonly && <span className="text-red-500">*</span>}
                    {f.label}
                    {f.helpText && (
                      <span className="text-gray-400 cursor-help" title={f.helpText}>
                        ⓘ
                      </span>
                    )}
                  </label>
                  {readonly ? (
                    <div className="text-sm text-gray-800 py-1.5 border-b border-gray-100 min-h-8">
                      {isNew && f.isSystem ? <span className="text-gray-400">—</span> : <FieldValue field={f} record={values} />}
                    </div>
                  ) : (
                    <FieldInput
                      field={f}
                      value={values[f.apiName]}
                      record={values}
                      invalid={Boolean(err)}
                      onChange={(v) => set(f.apiName, v)}
                      onLookup={(id, name) => {
                        set(f.apiName, id);
                        const nameKey = f.apiName.replace(/Id$/, 'Name');
                        if (nameKey !== f.apiName && byApi.has(nameKey)) set(nameKey, name);
                      }}
                    />
                  )}
                  {err && <div className="text-xs text-red-600 mt-1">{err}</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Btn>
      </div>
    </div>
  );
}

/** Modal that loads the describe for `object` and shows the layout-driven form. */
export function RecordFormModal({
  object,
  open,
  record,
  defaults,
  title,
  submit,
  onClose,
  onSaved,
}: {
  object: string;
  open: boolean;
  record?: Rec;
  defaults?: Rec;
  title?: string;
  submit: RecordFormProps['submit'];
  onClose: () => void;
  onSaved: (r: Rec) => void;
}) {
  const { data, error, loading } = useDescribe(object);
  if (!open) return null;
  const isNew = !record?._id;
  return (
    <Modal open={open} onClose={onClose} size="lg" title={title || (data ? `${isNew ? 'New' : 'Edit'} ${data.object.label}` : 'Loading…')}>
      <ErrorBanner error={error} />
      {loading && !data ? (
        <Loading />
      ) : data ? (
        isNew && !data.access.create ? (
          <p className="text-sm text-gray-600">You don&apos;t have permission to create {data.object.pluralLabel.toLowerCase()}.</p>
        ) : !isNew && !data.access.edit ? (
          <p className="text-sm text-gray-600">You don&apos;t have permission to edit {data.object.pluralLabel.toLowerCase()}.</p>
        ) : (
          <RecordFormBody
            key={String(record?._id ?? 'new')}
            describe={data}
            record={record}
            defaults={defaults}
            submit={submit}
            onSaved={onSaved}
            onCancel={onClose}
          />
        )
      ) : null}
    </Modal>
  );
}

/** Read-only record view following the layout. */
export function RecordDetails({ describe: d, record }: { describe: DescribeResponse; record: Rec }) {
  const byApi = new Map(d.object.fields.map((f) => [f.apiName, f]));
  return (
    <div>
      {d.layout.sections.map((s) => (
        <div key={s.id} className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 bg-gray-50 border-b border-gray-200 px-2 py-1.5 mb-3 rounded-t">
            {s.label}
          </h3>
          <dl className={`grid gap-x-5 gap-y-3 ${s.columns === 2 ? 'sm:grid-cols-2' : ''}`}>
            {s.items.map((it) => {
              const f = byApi.get(it.field);
              if (!f) return null;
              return (
                <div key={f.apiName} className="min-w-0 border-b border-gray-100 pb-1.5">
                  <dt className="text-xs text-gray-500">{f.label}</dt>
                  <dd className="text-sm text-gray-900 min-h-5">
                    <FieldValue field={f} record={record} />
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}

/** Submit helper for module APIs that take POST body / PATCH { _id, ...changes }. */
export function moduleSubmit(url: string, recordId?: string) {
  return (payload: Rec, isNew: boolean) =>
    isNew ? api<Rec>(url, { body: payload }) : api<Rec>(url, { method: 'PATCH', body: { _id: recordId, ...payload } });
}

/** Submit helper for custom objects (platform records API). */
export function platformSubmit(object: string, recordId?: string) {
  return (payload: Rec, isNew: boolean) =>
    isNew
      ? api<Rec>(`/api/platform/records/${object}`, { body: payload })
      : api<Rec>(`/api/platform/records/${object}/${recordId}`, { method: 'PATCH', body: payload });
}
