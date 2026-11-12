'use client';

import { useMemo, useState } from 'react';
import {
  OPERATOR_LABELS,
  VALUELESS_OPERATORS,
  type Condition,
  type FieldDescribe,
  type PermissionSetDTO,
  type ProfileDTO,
  type RestrictionAppliesTo,
  type RestrictionRuleDTO,
  type ValidationRuleDTO,
} from '@/lib/platform/types';
import { Badge, Btn, Checkbox, Empty, ErrorBanner, FormField, Input, Loading, Modal, SectionTitle, Select, TextArea, api, useLoad } from './ui';
import { ConditionBuilder, FormulaEditor } from './RuleEditors';
import type { ObjectDetail } from './ObjectManager';

function describeConditions(conds: Condition[], logic: string | undefined, fields: FieldDescribe[]) {
  const label = (api: string) => fields.find((f) => f.apiName === api)?.label || api;
  const parts = conds.map(
    (c, i) => `${i + 1}. ${label(c.field)} ${OPERATOR_LABELS[c.operator]}${VALUELESS_OPERATORS.includes(c.operator) ? '' : ` "${c.value ?? ''}"`}`,
  );
  return { parts, logic: logic || (conds.length > 1 ? 'All conditions (AND)' : '') };
}

/* ------------------------------------------------------------------ */
/* Validation rules                                                    */
/* ------------------------------------------------------------------ */

const NEW_VR: ValidationRuleDTO = {
  objectApiName: '',
  name: '',
  description: '',
  active: true,
  mode: 'builder',
  conditions: [],
  logic: '',
  formula: '',
  errorMessage: '',
  errorField: '',
};

export function ValidationRulesPanel({ obj, onChanged }: { obj: ObjectDetail; onChanged: () => void }) {
  const base = `/api/platform/objects/${obj.apiName}/validation-rules`;
  const { data, error, loading, reload } = useLoad(() => api<ValidationRuleDTO[]>(base), [base]);
  const [editing, setEditing] = useState<ValidationRuleDTO | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fields = obj.fields.filter((f) => f.active !== false);

  const toggle = async (r: ValidationRuleDTO) => {
    try {
      await api(`${base}/${r._id}`, { method: 'PATCH', body: { active: !r.active } });
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };
  const remove = async (r: ValidationRuleDTO) => {
    if (!window.confirm(`Delete check rule "${r.name}"?`)) return;
    try {
      await api(`${base}/${r._id}`, { method: 'DELETE' });
      reload();
      onChanged();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  return (
    <div>
      <SectionTitle
        title="Check Rules"
        subtitle="Block a save when the rule's condition is TRUE and show your error message to the user."
        actions={
          <Btn variant="primary" onClick={() => setEditing({ ...NEW_VR, objectApiName: obj.apiName })}>
            + New Rule
          </Btn>
        }
      />
      <ErrorBanner error={error || actionError} />
      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <Empty>No check rules yet.</Empty>
      ) : (
        <div className="space-y-2">
          {data.map((r) => {
            const d = r.mode === 'builder' ? describeConditions(r.conditions, r.logic, fields) : null;
            return (
              <div key={r._id} className="bg-white border border-[var(--p-border)] rounded p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${r.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <button type="button" className="font-semibold text-[var(--p-accent)] hover:underline" onClick={() => setEditing(r)}>
                        {r.name}
                      </button>
                      <Badge>{r.mode === 'formula' ? 'Formula' : 'Conditions'}</Badge>
                      {!r.active && <Badge tone="amber">Inactive</Badge>}
                    </div>
                    {r.description && <div className="text-sm text-gray-600 mt-1">{r.description}</div>}
                    <div className="text-xs text-gray-600 mt-2 font-mono break-words">
                      {r.mode === 'formula' ? r.formula : d!.parts.join('   ')}
                      {d?.logic && <div className="text-gray-500 font-sans mt-0.5">Logic: {d.logic}</div>}
                    </div>
                    <div className="text-xs text-red-700 mt-2">Error: {r.errorMessage}</div>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <button type="button" onClick={() => toggle(r)} className="text-gray-600 hover:text-gray-900">
                      {r.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" onClick={() => remove(r)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {editing && (
        <ValidationRuleModal
          obj={obj}
          fields={fields}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function ValidationRuleModal({
  obj,
  fields,
  initial,
  onClose,
  onSaved,
}: {
  obj: ObjectDetail;
  fields: FieldDescribe[];
  initial: ValidationRuleDTO;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ValidationRuleDTO>({ ...initial, conditions: initial.conditions || [] });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const base = `/api/platform/objects/${obj.apiName}/validation-rules`;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (form._id) await api(`${base}/${form._id}`, { method: 'PATCH', body: form });
      else await api(base, { body: form });
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
      title={form._id ? `Edit Check Rule` : `New Check Rule on ${obj.label}`}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving || !form.name || !form.errorMessage}>
            {saving ? 'Saving…' : 'Save'}
          </Btn>
        </>
      }
    >
      <ErrorBanner error={error} />
      <div className="grid sm:grid-cols-2 gap-x-4">
        <FormField label="Rule Name" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="Active">
          <Checkbox checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Enforce this rule" />
        </FormField>
      </div>
      <FormField label="Description">
        <Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </FormField>

      <div className="mt-2 mb-3 flex items-center gap-4">
        <span className="text-xs font-medium text-gray-700">Error condition</span>
        <div className="inline-flex rounded border border-gray-300 overflow-hidden text-xs">
          {(['builder', 'formula'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setForm({ ...form, mode: m })}
              className={`px-3 py-1 ${form.mode === m ? 'bg-[var(--p-accent)] text-white' : 'bg-white text-gray-700'}`}
            >
              {m === 'builder' ? 'Conditions' : 'Formula'}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        The record is <b>rejected</b> when this evaluates to TRUE.
        {form.mode === 'formula' && ' Use ISCHANGED(field), PRIORVALUE(field) and ISNEW() to check what changed in this save.'}
      </p>
      <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
        {form.mode === 'builder' ? (
          <ConditionBuilder
            fields={fields}
            conditions={form.conditions}
            onChange={(c) => setForm({ ...form, conditions: c })}
            logic={form.logic || ''}
            onLogicChange={(l) => setForm({ ...form, logic: l })}
            allowUserTokens
          />
        ) : (
          <FormulaEditor value={form.formula || ''} onChange={(v) => setForm({ ...form, formula: v })} fields={fields} />
        )}
      </div>

      <div className="grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-x-4">
        <FormField label="Error Message" required>
          <TextArea rows={2} value={form.errorMessage} onChange={(e) => setForm({ ...form, errorMessage: e.target.value })} />
        </FormField>
        <FormField label="Error Location">
          <Select value={form.errorField || ''} onChange={(e) => setForm({ ...form, errorField: e.target.value })}>
            <option value="">Top of page</option>
            {fields
              .filter((f) => !f.isSystem)
              .map((f) => (
                <option key={f.apiName} value={f.apiName}>
                  Field: {f.label}
                </option>
              ))}
          </Select>
        </FormField>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Restriction rules                                                   */
/* ------------------------------------------------------------------ */

const NEW_RR: RestrictionRuleDTO = {
  objectApiName: '',
  name: '',
  description: '',
  active: true,
  appliesTo: 'profiles',
  appliesToIds: [],
  conditions: [{ field: 'ownerId', operator: 'equals', value: '$User.Id' }],
  logic: '',
};

type Member = { _id: string; name: string; email: string };

export function RestrictionRulesPanel({ obj, onChanged }: { obj: ObjectDetail; onChanged: () => void }) {
  const base = `/api/platform/objects/${obj.apiName}/restriction-rules`;
  const { data, error, loading, reload } = useLoad(() => api<RestrictionRuleDTO[]>(base), [base]);
  const { data: profiles } = useLoad(() => api<ProfileDTO[]>('/api/platform/profiles'), []);
  const { data: sets } = useLoad(() => api<PermissionSetDTO[]>('/api/platform/permission-sets'), []);
  const { data: users } = useLoad(() => api<Member[]>('/api/platform/users'), []);
  const [editing, setEditing] = useState<RestrictionRuleDTO | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Formula values are computed on read, so they can't filter database queries.
  const fields = obj.fields.filter((f) => f.active !== false && f.type !== 'formula');

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    (profiles || []).forEach((p) => m.set(p._id!, p.name));
    (sets || []).forEach((s) => m.set(s._id!, s.name));
    (users || []).forEach((u) => m.set(u._id, u.name || u.email));
    return (id: string) => m.get(id) || id;
  }, [profiles, sets, users]);

  const appliesText = (r: RestrictionRuleDTO) =>
    r.appliesTo === 'all'
      ? 'Everyone (except users with View All)'
      : `${{ profiles: 'Roles', permissionSets: 'Access packs', users: 'Users' }[r.appliesTo]}: ${r.appliesToIds.map(nameOf).join(', ')}`;

  const toggle = async (r: RestrictionRuleDTO) => {
    try {
      await api(`${base}/${r._id}`, { method: 'PATCH', body: { active: !r.active } });
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };
  const remove = async (r: RestrictionRuleDTO) => {
    if (!window.confirm(`Delete record filter "${r.name}"?`)) return;
    try {
      await api(`${base}/${r._id}`, { method: 'DELETE' });
      reload();
      onChanged();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const hasOwner = fields.some((f) => f.apiName === 'ownerId');

  return (
    <div>
      <SectionTitle
        title="Record Filters"
        subtitle={
          <>
            Limit which {obj.pluralLabel.toLowerCase()} a group of users can see. Matching users only see records that meet the criteria — in lists,
            links, record pages and when editing. Users with View All on this module or View All Data aren&apos;t restricted. If several filters apply
            to a user, they see records matching any of them.
          </>
        }
        actions={
          <Btn
            variant="primary"
            onClick={() =>
              setEditing({
                ...NEW_RR,
                objectApiName: obj.apiName,
                conditions: hasOwner ? NEW_RR.conditions : [{ field: fields[0]?.apiName || '', operator: 'equals', value: '' }],
              })
            }
          >
            + New Record Filter
          </Btn>
        }
      />
      {!obj.enforced && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
          Record filters on this module apply once its record pages are connected to the platform.
        </p>
      )}
      <ErrorBanner error={error || actionError} />
      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <Empty>No record filters. Every user with Read access sees all {obj.pluralLabel.toLowerCase()} in the workspace.</Empty>
      ) : (
        <div className="space-y-2">
          {data.map((r) => {
            const d = describeConditions(r.conditions, r.logic, fields);
            return (
              <div key={r._id} className="bg-white border border-[var(--p-border)] rounded p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${r.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <button type="button" className="font-semibold text-[var(--p-accent)] hover:underline" onClick={() => setEditing(r)}>
                        {r.name}
                      </button>
                      {!r.active && <Badge tone="amber">Inactive</Badge>}
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                      <b>Applies to:</b> {appliesText(r)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 font-mono break-words">
                      <b className="font-sans">Can only see records where:</b> {d.parts.join('   ')}
                      {d.logic && <div className="font-sans text-gray-500">Logic: {d.logic}</div>}
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <button type="button" onClick={() => toggle(r)} className="text-gray-600 hover:text-gray-900">
                      {r.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" onClick={() => remove(r)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {editing && (
        <RestrictionRuleModal
          obj={obj}
          fields={fields}
          initial={editing}
          profiles={profiles || []}
          sets={sets || []}
          users={users || []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function RestrictionRuleModal({
  obj,
  fields,
  initial,
  profiles,
  sets,
  users,
  onClose,
  onSaved,
}: {
  obj: ObjectDetail;
  fields: FieldDescribe[];
  initial: RestrictionRuleDTO;
  profiles: ProfileDTO[];
  sets: PermissionSetDTO[];
  users: Member[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<RestrictionRuleDTO>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const base = `/api/platform/objects/${obj.apiName}/restriction-rules`;

  const options: { id: string; label: string }[] =
    form.appliesTo === 'profiles'
      ? profiles.filter((p) => p.key !== 'system_admin').map((p) => ({ id: p._id!, label: p.name }))
      : form.appliesTo === 'permissionSets'
        ? sets.map((s) => ({ id: s._id!, label: s.name }))
        : form.appliesTo === 'users'
          ? users.map((u) => ({ id: u._id, label: `${u.name} (${u.email})` }))
          : [];

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (form._id) await api(`${base}/${form._id}`, { method: 'PATCH', body: form });
      else await api(base, { body: form });
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
      title={form._id ? 'Edit Record Filter' : `New Record Filter on ${obj.label}`}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving || !form.name}>
            {saving ? 'Saving…' : 'Save'}
          </Btn>
        </>
      }
    >
      <ErrorBanner error={error} />
      <div className="grid sm:grid-cols-2 gap-x-4">
        <FormField label="Rule Name" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="Active">
          <Checkbox checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Enforce this rule" />
        </FormField>
      </div>
      <FormField label="Description">
        <Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </FormField>

      <h3 className="text-sm font-semibold text-gray-800 mt-2 mb-2">1. User criteria — who is restricted</h3>
      <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
        <Select
          className="!w-64 mb-2"
          value={form.appliesTo}
          onChange={(e) => setForm({ ...form, appliesTo: e.target.value as RestrictionAppliesTo, appliesToIds: [] })}
        >
          <option value="all">All users</option>
          <option value="profiles">Users with these roles</option>
          <option value="permissionSets">Users with these access packs</option>
          <option value="users">Specific users</option>
        </Select>
        {form.appliesTo !== 'all' && (
          <div className="grid sm:grid-cols-2 gap-1 max-h-44 overflow-y-auto">
            {options.length === 0 && <div className="text-xs text-gray-500">Nothing to choose yet.</div>}
            {options.map((o) => (
              <Checkbox
                key={o.id}
                checked={form.appliesToIds.includes(o.id)}
                onChange={(v) =>
                  setForm({ ...form, appliesToIds: v ? [...form.appliesToIds, o.id] : form.appliesToIds.filter((x) => x !== o.id) })
                }
                label={<span className="text-sm">{o.label}</span>}
              />
            ))}
          </div>
        )}
      </div>

      <h3 className="text-sm font-semibold text-gray-800 mb-1">2. Record criteria — which records they can see</h3>
      <p className="text-xs text-gray-500 mb-2">
        Tip: <span className="font-mono">Owner ID equals $User.Id</span> limits users to records they own.
      </p>
      <div className="bg-gray-50 border border-gray-200 rounded p-3">
        <ConditionBuilder
          fields={fields}
          conditions={form.conditions}
          onChange={(c) => setForm({ ...form, conditions: c })}
          logic={form.logic || ''}
          onLogicChange={(l) => setForm({ ...form, logic: l })}
          allowUserTokens
        />
      </div>
    </Modal>
  );
}
