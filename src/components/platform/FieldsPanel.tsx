'use client';

import { useMemo, useState } from 'react';
import {
  FIELD_TYPE_LABELS,
  type FieldDescribe,
  type FieldType,
  type ObjectSummary,
  type PageLayoutDTO,
  type PicklistOption,
  type ProfileDTO,
} from '@/lib/platform/types';
import { Badge, Btn, Checkbox, Empty, ErrorBanner, FormField, Input, Modal, SectionTitle, Select, Table, TextArea, api, td, th, useLoad } from './ui';
import { FormulaEditor } from './RuleEditors';
import type { ObjectDetail } from './ObjectManager';

const TYPE_HELP: Record<FieldType, string> = {
  text: 'Letters and numbers, up to 255 characters.',
  textarea: 'Multiple lines of text.',
  number: 'Numbers, with optional decimal places.',
  currency: 'Money amounts (₹).',
  percent: 'A percentage, e.g. 12.5.',
  date: 'A calendar date.',
  datetime: 'A date and time.',
  checkbox: 'True or false.',
  picklist: 'Pick one value from a list.',
  multipicklist: 'Pick several values from a list.',
  email: 'An email address (validated).',
  phone: 'A phone number.',
  url: 'A web address.',
  lookup: 'Link to a record of another object.',
  formula: 'Read-only value calculated from other fields.',
};

export function typeLabel(f: FieldDescribe): string {
  if (f.type === 'lookup') return `Lookup(${f.referenceTo || '?'})`;
  if (f.type === 'formula') return `Formula (${f.returnType || 'text'})`;
  if (['text', 'email', 'phone', 'url'].includes(f.type) && f.length) return `${FIELD_TYPE_LABELS[f.type]}(${f.length})`;
  return FIELD_TYPE_LABELS[f.type] || f.type;
}

export function FieldsPanel({ obj, onChanged }: { obj: ObjectDetail; onChanged: () => void }) {
  const [query, setQuery] = useState('');
  const [wizard, setWizard] = useState(false);
  const [editing, setEditing] = useState<FieldDescribe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return obj.fields.filter((f) => !q || f.label.toLowerCase().includes(q) || f.apiName.toLowerCase().includes(q));
  }, [obj.fields, query]);

  const remove = async (f: FieldDescribe) => {
    const msg = f.isCustom
      ? `Delete field "${f.label}"? Its data on every record will be permanently removed.`
      : `Reset "${f.label}" to its original label, help text and picklist values?`;
    if (!window.confirm(msg)) return;
    setError(null);
    try {
      await api(`/api/platform/objects/${obj.apiName}/fields/${f.apiName}`, { method: 'DELETE' });
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <SectionTitle
        title="Fields & Relationships"
        subtitle={obj.supportsCustomFields ? undefined : 'Custom fields will be available when this object is connected. You can rename built-in fields now.'}
        actions={
          <>
            <Input className="!w-48" placeholder="Quick find…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Btn variant="primary" disabled={!obj.supportsCustomFields} onClick={() => setWizard(true)}>
              + New Field
            </Btn>
          </>
        }
      />
      <ErrorBanner error={error} />
      {rows.length === 0 ? (
        <Empty>No fields match.</Empty>
      ) : (
        <Table
          head={
            <tr>
              <th className={th}>Field Label</th>
              <th className={th}>API Name</th>
              <th className={th}>Data Type</th>
              <th className={th}>Required</th>
              <th className={th}></th>
            </tr>
          }
        >
          {rows.map((f) => (
            <tr key={f.apiName} className="hover:bg-gray-50">
              <td className={td}>
                <button
                  type="button"
                  disabled={f.isSystem}
                  onClick={() => setEditing(f)}
                  className={`font-medium text-left ${f.isSystem ? 'text-gray-700 cursor-default' : 'text-[var(--p-accent)] hover:underline'}`}
                >
                  {f.label}
                </button>
                <div className="flex gap-1 mt-0.5">
                  {f.isCustom && <Badge tone="accent">Custom</Badge>}
                  {f.isSystem && <Badge>System</Badge>}
                  {!f.isCustom && f.id && <Badge tone="blue">Customised</Badge>}
                  {f.unique && <Badge>Unique</Badge>}
                  {f.active === false && <Badge tone="amber">Inactive</Badge>}
                </div>
              </td>
              <td className={`${td} font-mono text-xs text-gray-600`}>{f.apiName}</td>
              <td className={`${td} text-gray-700`}>{typeLabel(f)}</td>
              <td className={td}>{f.required ? '✓' : ''}</td>
              <td className={`${td} text-right whitespace-nowrap`}>
                {(f.isCustom || f.id) && (
                  <button type="button" onClick={() => remove(f)} className="text-xs text-red-600 hover:underline">
                    {f.isCustom ? 'Delete' : 'Reset'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      {wizard && (
        <NewFieldWizard
          obj={obj}
          onClose={() => setWizard(false)}
          onCreated={() => {
            setWizard(false);
            onChanged();
          }}
        />
      )}
      {editing && (
        <EditFieldModal
          obj={obj}
          field={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Picklist values editor                                              */
/* ------------------------------------------------------------------ */

export function PicklistEditor({
  values,
  onChange,
  locked,
}: {
  values: PicklistOption[];
  onChange: (v: PicklistOption[]) => void;
  /** Built-in values: can relabel/reorder/deactivate but not add or remove. */
  locked?: boolean;
}) {
  const [bulk, setBulk] = useState('');
  const set = (i: number, patch: Partial<PicklistOption>) =>
    onChange(
      values.map((v, idx) => {
        if (idx === i) return { ...v, ...patch };
        if (patch.isDefault) return { ...v, isDefault: false };
        return v;
      }),
    );
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= values.length) return;
    const next = [...values];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const addBulk = () => {
    const existing = new Set(values.map((v) => v.value));
    const added = bulk
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter((s) => s && !existing.has(s))
      .map((s) => ({ value: s, label: s, active: true }));
    onChange([...values, ...added]);
    setBulk('');
  };

  return (
    <div>
      <div className="border border-gray-200 rounded divide-y divide-gray-100">
        {values.length === 0 && <div className="text-xs text-gray-500 p-2">No values yet.</div>}
        {values.map((v, i) => (
          <div key={`${v.value}-${i}`} className="flex flex-wrap items-center gap-2 p-1.5">
            <div className="flex flex-col">
              <button type="button" className="text-[10px] text-gray-400 hover:text-gray-700 leading-none" onClick={() => move(i, -1)} aria-label="Move up">
                ▲
              </button>
              <button type="button" className="text-[10px] text-gray-400 hover:text-gray-700 leading-none" onClick={() => move(i, 1)} aria-label="Move down">
                ▼
              </button>
            </div>
            <Input
              className="!w-36 !py-1 text-xs font-mono"
              value={v.value}
              disabled={locked}
              title="API value (stored on records)"
              onChange={(e) => set(i, { value: e.target.value })}
            />
            <Input
              className="flex-1 min-w-24 !py-1 text-xs"
              value={v.label ?? v.value}
              title="Label shown to users"
              onChange={(e) => set(i, { label: e.target.value })}
            />
            <input
              type="color"
              value={v.color || '#94a3b8'}
              onChange={(e) => set(i, { color: e.target.value })}
              className="w-7 h-7 border border-gray-300 rounded cursor-pointer"
              title="Colour"
            />
            <Checkbox checked={v.active !== false} onChange={(a) => set(i, { active: a })} label={<span className="text-xs">Active</span>} />
            <Checkbox checked={Boolean(v.isDefault)} onChange={(d) => set(i, { isDefault: d })} label={<span className="text-xs">Default</span>} />
            {!locked && (
              <button type="button" onClick={() => onChange(values.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-600" aria-label="Remove value">
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {!locked && (
        <div className="flex gap-2 mt-2">
          <TextArea rows={2} className="text-xs" placeholder="Add values — one per line or comma-separated" value={bulk} onChange={(e) => setBulk(e.target.value)} />
          <Btn size="sm" onClick={addBulk} disabled={!bulk.trim()}>
            Add
          </Btn>
        </div>
      )}
      {locked && <p className="text-xs text-gray-500 mt-1">Built-in values can be relabelled, reordered or deactivated.</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Field details form (shared by wizard + edit)                        */
/* ------------------------------------------------------------------ */

type FieldForm = {
  label: string;
  apiName: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  length?: number;
  scale?: number;
  picklistValues: PicklistOption[];
  restrictedPicklist: boolean;
  referenceTo: string;
  formula: string;
  returnType: string;
  defaultValue: string | boolean;
  helpText: string;
  description: string;
  active: boolean;
};

function initialForm(f?: FieldDescribe): FieldForm {
  return {
    label: f?.label || '',
    apiName: f?.apiName || '',
    type: f?.type || 'text',
    required: Boolean(f?.required),
    unique: Boolean(f?.unique),
    length: f?.length,
    scale: f?.scale,
    picklistValues: f?.picklistValues || [],
    restrictedPicklist: f?.restrictedPicklist !== false,
    referenceTo: f?.referenceTo || '',
    formula: f?.formula || '',
    returnType: f?.returnType || 'number',
    defaultValue: (f?.defaultValue as string | boolean | undefined) ?? (f?.type === 'checkbox' ? false : ''),
    helpText: f?.helpText || '',
    description: f?.description || '',
    active: f?.active !== false,
  };
}

function FieldDetailsForm({
  form,
  setForm,
  obj,
  isNew,
  isStandard,
  requiredLocked,
}: {
  form: FieldForm;
  setForm: (f: FieldForm) => void;
  obj: ObjectDetail;
  isNew: boolean;
  isStandard?: boolean;
  requiredLocked?: boolean;
}) {
  const { data: objects } = useLoad(
    () => (form.type === 'lookup' && !isStandard ? api<ObjectSummary[]>('/api/platform/objects') : Promise.resolve([] as ObjectSummary[])),
    [form.type, isStandard],
  );
  const t = form.type;
  const otherFields = obj.fields.filter((f) => f.apiName !== form.apiName);
  const autoApi = form.label.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-x-4">
        <FormField label="Field Label" required>
          <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </FormField>
        {!isStandard && (
          <FormField label="API Name" help="Used in formulas, rules and integrations. Can't be changed later.">
            <div className="flex items-center gap-1">
              <Input
                className="font-mono"
                disabled={!isNew}
                value={isNew ? form.apiName.replace(/__c$/, '') : form.apiName}
                placeholder={autoApi}
                onChange={(e) => setForm({ ...form, apiName: e.target.value })}
              />
              {isNew && <span className="text-xs font-mono text-gray-500">__c</span>}
            </div>
          </FormField>
        )}
      </div>

      {!isStandard && ['text', 'email', 'phone', 'url', 'textarea'].includes(t) && (
        <FormField label="Length" help={t === 'textarea' ? 'Max 32,000' : 'Max 255'}>
          <Input
            type="number"
            className="!w-32"
            value={form.length ?? (t === 'textarea' ? 32000 : 255)}
            onChange={(e) => setForm({ ...form, length: Number(e.target.value) })}
          />
        </FormField>
      )}
      {!isStandard && ['number', 'currency', 'percent'].includes(t) && (
        <FormField label="Decimal Places">
          <Input type="number" className="!w-32" min={0} max={8} value={form.scale ?? (t === 'number' ? 0 : 2)} onChange={(e) => setForm({ ...form, scale: Number(e.target.value) })} />
        </FormField>
      )}
      {(t === 'picklist' || t === 'multipicklist') && (
        <FormField label="Values" required>
          <PicklistEditor values={form.picklistValues} onChange={(v) => setForm({ ...form, picklistValues: v })} locked={isStandard} />
          {!isStandard && (
            <div className="mt-2">
              <Checkbox
                checked={form.restrictedPicklist}
                onChange={(v) => setForm({ ...form, restrictedPicklist: v })}
                label={<span className="text-xs">Restrict to the values defined above</span>}
              />
            </div>
          )}
        </FormField>
      )}
      {t === 'lookup' && !isStandard && (
        <FormField label="Related To" required>
          <Select value={form.referenceTo} disabled={!isNew} onChange={(e) => setForm({ ...form, referenceTo: e.target.value })}>
            <option value="">— choose object —</option>
            {(objects || []).map((o) => (
              <option key={o.apiName} value={o.apiName}>
                {o.label} ({o.apiName})
              </option>
            ))}
          </Select>
        </FormField>
      )}
      {t === 'formula' && (
        <>
          <FormField label="Formula Return Type" required>
            <Select className="!w-48" value={form.returnType} onChange={(e) => setForm({ ...form, returnType: e.target.value })}>
              {['number', 'currency', 'percent', 'text', 'date', 'checkbox'].map((r) => (
                <option key={r} value={r}>
                  {FIELD_TYPE_LABELS[r as FieldType]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Formula" required>
            <FormulaEditor value={form.formula} onChange={(v) => setForm({ ...form, formula: v })} fields={otherFields} hint="annualRevenue / 12" />
          </FormField>
        </>
      )}

      <div className="grid sm:grid-cols-2 gap-x-4">
        <FormField label="Help Text" help="Shown as a tooltip next to the field">
          <Input value={form.helpText} onChange={(e) => setForm({ ...form, helpText: e.target.value })} />
        </FormField>
        {!isStandard && t !== 'formula' && t !== 'lookup' && (
          <FormField label="Default Value">
            {t === 'checkbox' ? (
              <Select value={String(form.defaultValue === true)} onChange={(e) => setForm({ ...form, defaultValue: e.target.value === 'true' })}>
                <option value="false">Unchecked</option>
                <option value="true">Checked</option>
              </Select>
            ) : t === 'picklist' || t === 'multipicklist' ? (
              <div className="text-xs text-gray-500 pt-2">Mark a value as Default above.</div>
            ) : (
              <Input
                type={t === 'date' ? 'date' : ['number', 'currency', 'percent'].includes(t) ? 'number' : 'text'}
                value={String(form.defaultValue ?? '')}
                onChange={(e) => setForm({ ...form, defaultValue: e.target.value })}
              />
            )}
          </FormField>
        )}
      </div>
      <FormField label="Description" help="For admins — not shown to users">
        <TextArea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </FormField>
      <div className="flex flex-wrap gap-4">
        {t !== 'formula' && t !== 'checkbox' && (
          <Checkbox
            checked={form.required || Boolean(requiredLocked)}
            disabled={requiredLocked}
            onChange={(v) => setForm({ ...form, required: v })}
            label="Required — always require a value to save a record"
            title={requiredLocked ? 'Required by the application' : undefined}
          />
        )}
        {!isStandard && ['text', 'email', 'phone', 'number'].includes(t) && (
          <Checkbox checked={form.unique} onChange={(v) => setForm({ ...form, unique: v })} label="Unique — no two records may share a value" />
        )}
      </div>
    </div>
  );
}

function payload(form: FieldForm) {
  return {
    ...form,
    apiName: form.apiName.replace(/__c$/, ''),
    defaultValue: form.defaultValue === '' ? undefined : form.defaultValue,
  };
}

/* ------------------------------------------------------------------ */
/* New field wizard                                                    */
/* ------------------------------------------------------------------ */

function NewFieldWizard({ obj, onClose, onCreated }: { obj: ObjectDetail; onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FieldForm>(initialForm());
  const [access, setAccess] = useState<Record<string, { read: boolean; edit: boolean }>>({});
  const [layoutIds, setLayoutIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: profiles } = useLoad(() => api<ProfileDTO[]>('/api/platform/profiles'), []);
  const { data: layoutData } = useLoad(
    () => api<{ layouts: PageLayoutDTO[] }>(`/api/platform/objects/${obj.apiName}/layouts`),
    [obj.apiName],
  );
  const layouts = layoutData?.layouts || [];
  const selectedLayouts = layoutIds ?? layouts.map((l) => l._id!);
  const fpFor = (id: string) => access[id] || { read: true, edit: form.type !== 'formula' };

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      await api(`/api/platform/objects/${obj.apiName}/fields`, {
        body: {
          ...payload(form),
          addToLayouts: selectedLayouts,
          fieldAccess: Object.fromEntries((profiles || []).filter((p) => p.key !== 'system_admin').map((p) => [p._id, fpFor(p._id!)])),
        },
      });
      onCreated();
    } catch (e) {
      setError((e as Error).message);
      setStep(2);
    } finally {
      setSaving(false);
    }
  };

  const stepTitles = ['Data type', 'Details', 'Field-level security', 'Page layouts'];
  const canNext =
    step === 1 ||
    (step === 2 &&
      form.label.trim() &&
      (!['picklist', 'multipicklist'].includes(form.type) || form.picklistValues.length) &&
      (form.type !== 'lookup' || form.referenceTo) &&
      (form.type !== 'formula' || form.formula.trim())) ||
    step === 3;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`New Field on ${obj.label} — Step ${step} of 4: ${stepTitles[step - 1]}`}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          {step > 1 && <Btn onClick={() => setStep(step - 1)}>Back</Btn>}
          {step < 4 ? (
            <Btn variant="primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Next
            </Btn>
          ) : (
            <Btn variant="primary" disabled={saving} onClick={create}>
              {saving ? 'Saving…' : 'Save'}
            </Btn>
          )}
        </>
      }
    >
      <ErrorBanner error={error} />
      {step === 1 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
            <label
              key={t}
              className={`border rounded p-3 cursor-pointer ${form.type === t ? 'border-[var(--p-accent)] bg-[var(--p-accent-bg)]' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <input type="radio" className="sr-only" checked={form.type === t} onChange={() => setForm({ ...initialForm(), label: form.label, type: t })} />
              <div className="text-sm font-medium text-gray-900">{FIELD_TYPE_LABELS[t]}</div>
              <div className="text-xs text-gray-500">{TYPE_HELP[t]}</div>
            </label>
          ))}
        </div>
      )}
      {step === 2 && <FieldDetailsForm form={form} setForm={setForm} obj={obj} isNew />}
      {step === 3 && (
        <div>
          <p className="text-sm text-gray-600 mb-3">Choose which profiles can see and edit this field. System Administrators always have full access.</p>
          <Table
            head={
              <tr>
                <th className={th}>Profile</th>
                <th className={th}>Visible</th>
                <th className={th}>Editable</th>
              </tr>
            }
          >
            {(profiles || [])
              .filter((p) => p.key !== 'system_admin')
              .map((p) => {
                const fp = fpFor(p._id!);
                return (
                  <tr key={p._id}>
                    <td className={td}>{p.name}</td>
                    <td className={td}>
                      <Checkbox checked={fp.read} onChange={(v) => setAccess({ ...access, [p._id!]: { read: v, edit: v && fp.edit } })} />
                    </td>
                    <td className={td}>
                      <Checkbox
                        checked={fp.edit}
                        disabled={form.type === 'formula'}
                        onChange={(v) => setAccess({ ...access, [p._id!]: { read: v || fp.read, edit: v } })}
                      />
                    </td>
                  </tr>
                );
              })}
          </Table>
        </div>
      )}
      {step === 4 && (
        <div>
          {layouts.length === 0 ? (
            <p className="text-sm text-gray-600">
              This object uses the automatic layout, which always includes new fields. Create a page layout to control placement.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-3">Add the field to these page layouts:</p>
              <div className="space-y-2">
                {layouts.map((l) => (
                  <Checkbox
                    key={l._id}
                    checked={selectedLayouts.includes(l._id!)}
                    onChange={(v) => setLayoutIds(v ? [...selectedLayouts, l._id!] : selectedLayouts.filter((x) => x !== l._id))}
                    label={l.name}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Edit field                                                          */
/* ------------------------------------------------------------------ */

function EditFieldModal({ obj, field, onClose, onSaved }: { obj: ObjectDetail; field: FieldDescribe; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FieldForm>(initialForm(field));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isStandard = !field.isCustom;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = isStandard
        ? { label: form.label, helpText: form.helpText, description: form.description, required: form.required, picklistValues: field.picklistValues ? form.picklistValues : undefined }
        : payload(form);
      await api(`/api/platform/objects/${obj.apiName}/fields/${field.apiName}`, { method: 'PATCH', body });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={
        <span>
          {field.label} <span className="text-xs font-normal text-gray-500">· {typeLabel(field)}</span>
        </span>
      }
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={saving || !form.label.trim()} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
          </Btn>
        </>
      }
    >
      <ErrorBanner error={error} />
      {isStandard && (
        <p className="text-xs text-gray-500 mb-3">
          Built-in field <span className="font-mono">{field.apiName}</span>. You can rename it, add help text, make it required and adjust picklist values.
        </p>
      )}
      <FieldDetailsForm form={form} setForm={setForm} obj={obj} isNew={false} isStandard={isStandard} requiredLocked={field.requiredLocked} />
      {!isStandard && (
        <div className="mt-3">
          <Checkbox checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Active" />
        </div>
      )}
    </Modal>
  );
}
