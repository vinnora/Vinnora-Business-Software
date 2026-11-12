'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../_components/PageHeader';
import { Modal, Field, TextInput, TextArea, SelectInput } from '../_components/Modal';
import { SubscriptionPlan } from '@/components/SubscriptionPlan';
import { ModuleAccessLink, ModuleObjectManager } from '@/components/platform/ModuleSetupTabs';

type Tab =
  | 'workflows'
  | 'templates'
  | 'slas'
  | 'technicians'
  | 'channels'
  | 'integrations'
  | 'connections'
  | 'objects' | 'access' | 'subscription';

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'workflows', label: 'Workflows & Automation', desc: 'Rules that fire on record events' },
  { id: 'templates', label: 'Email Templates', desc: 'Reusable templates with merge fields' },
  { id: 'slas', label: 'SLAs', desc: 'Service level agreements for tickets' },
  { id: 'technicians', label: 'Technicians', desc: 'Field team roster' },
  { id: 'channels', label: 'Channels', desc: 'Inbound channels & Email-to-Ticket' },
  { id: 'integrations', label: 'Integrations', desc: 'Third-party apps & services' },
  { id: 'connections', label: 'App Connections', desc: 'Cross-app data flows' },
  { id: 'objects', label: 'Data Model', desc: 'Modules, fields, dropdowns, rules & layouts' },
  { id: 'access', label: 'Users & Access', desc: 'Roles & access packs' },
  { id: 'subscription', label: 'Subscription & Plan', desc: 'Manage your plan & billing' },
];

export default function SetupPage() {
  const [tab, setTab] = useState<Tab>('workflows');
  return (
    <>
      <PageHeader title="Settings" subtitle="Customize your CRM" />
      <div className="flex">
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-7rem)]">
          <div className="p-3 text-xs uppercase tracking-wide text-gray-500 font-semibold">
            Customization
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-4 py-2.5 text-sm border-l-2 ${
                tab === t.id
                  ? 'bg-blue-50 border-[#0176d3] text-[#0176d3] font-medium'
                  : 'border-transparent text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div>{t.label}</div>
              <div className="text-[11px] text-gray-500 font-normal mt-0.5">{t.desc}</div>
            </button>
          ))}
        </aside>
        <div className="flex-1 p-6">
          {tab === 'workflows' && <WorkflowsTab />}
          {tab === 'templates' && <TemplatesTab />}
          {tab === 'slas' && <SlasTab />}
          {tab === 'technicians' && <TechniciansTab />}
          {tab === 'channels' && <ChannelsTab />}
          {tab === 'integrations' && <SalesIntegrationsTab />}
          {tab === 'connections' && <SalesConnectionsTab />}
          {tab === 'objects' && <ModuleObjectManager app="sales-service" />}
          {tab === 'access' && <ModuleAccessLink app="sales-service" />}
          {tab === 'subscription' && <SubscriptionPlan accentColor="#0176d3" accentBg="#E0F4F8" textColor="#012A4A" mutedColor="#6B7280" borderColor="#E5E7EB" />}
        </div>
      </div>
    </>
  );
}

/* -------------------- Workflows -------------------- */

const WORKFLOW_OBJECTS = ['Lead', 'Opportunity', 'Case', 'Contact', 'Account'];
// Display names for the object API names above (stored values stay unchanged).
const OBJECT_LABELS: Record<string, string> = {
  Lead: 'Enquiry',
  Opportunity: 'Deal',
  Case: 'Ticket',
  Contact: 'Person',
  Account: 'Company',
};
const WORKFLOW_EVENTS = [
  { value: 'created', label: 'When record is created' },
  { value: 'updated', label: 'When record is updated' },
  { value: 'fieldChanged', label: 'When a watched field changes' },
];
const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'notEquals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'greaterThan', label: '>' },
  { value: 'lessThan', label: '<' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' },
];
const ACTION_TYPES = [
  { value: 'createActivity', label: 'Create Follow-up / To-do' },
  { value: 'updateField', label: 'Update field' },
  { value: 'assignOwner', label: 'Assign owner' },
  { value: 'sendEmail', label: 'Send email (logged)' },
  { value: 'escalateCase', label: 'Escalate ticket' },
  { value: 'createWorkOrder', label: 'Create Job Card (from Ticket)' },
  { value: 'webhook', label: 'Outbound webhook' },
];

function WorkflowsTab() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    objectType: 'Lead',
    triggerEvent: 'created',
    conditionLogic: 'AND',
    conditions: [],
    actions: [],
    active: true,
  });

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/sales-service/workflows').then((r) => r.json());
    setRules(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.name) return;
    await fetch('/api/sales-service/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setOpen(false);
    setForm({
      objectType: 'Lead',
      triggerEvent: 'created',
      conditionLogic: 'AND',
      conditions: [],
      actions: [],
      active: true,
    });
    load();
  };

  const toggle = async (rule: any) => {
    await fetch('/api/sales-service/workflows', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: rule._id, active: !rule.active }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    await fetch(`/api/sales-service/workflows?id=${id}`, { method: 'DELETE' });
    load();
  };

  const addCondition = () =>
    setForm({ ...form, conditions: [...form.conditions, { field: '', operator: 'equals', value: '' }] });
  const updateCondition = (i: number, patch: any) =>
    setForm({
      ...form,
      conditions: form.conditions.map((c: any, idx: number) => (idx === i ? { ...c, ...patch } : c)),
    });
  const removeCondition = (i: number) =>
    setForm({ ...form, conditions: form.conditions.filter((_: any, idx: number) => idx !== i) });

  const addAction = () =>
    setForm({ ...form, actions: [...form.actions, { type: 'createActivity', params: {} }] });
  const updateAction = (i: number, patch: any) =>
    setForm({
      ...form,
      actions: form.actions.map((a: any, idx: number) => (idx === i ? { ...a, ...patch } : a)),
    });
  const updateActionParam = (i: number, key: string, value: any) =>
    setForm({
      ...form,
      actions: form.actions.map((a: any, idx: number) =>
        idx === i ? { ...a, params: { ...a.params, [key]: value } } : a
      ),
    });
  const removeAction = (i: number) =>
    setForm({ ...form, actions: form.actions.filter((_: any, idx: number) => idx !== i) });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Workflows &amp; Automation</h2>
          <p className="text-sm text-gray-500">
            Rules fire on record events. Use {'{{field}}'} merge fields in actions.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded"
        >
          + New Rule
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : rules.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded p-8 text-center text-gray-500">
          No automation rules yet. Click <strong>+ New Rule</strong> to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div
              key={r._id}
              className="bg-white border border-gray-200 rounded p-4 flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${r.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="font-semibold text-gray-900">{r.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{OBJECT_LABELS[r.objectType] || r.objectType}</span>
                  <span className="text-xs text-gray-500">{r.triggerEvent}</span>
                </div>
                {r.description && <div className="text-sm text-gray-600 mt-1">{r.description}</div>}
                <div className="text-xs text-gray-500 mt-2">
                  {r.conditions.length} conditions • {r.actions.length} actions • Run {r.runCount || 0}×
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => toggle(r)} className="text-gray-600 hover:text-gray-900">
                  {r.active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => remove(r._id)} className="text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Workflow Rule"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded">Cancel</button>
            <button onClick={save} className="px-3 py-1.5 text-sm bg-[#0176d3] text-white rounded">Save Rule</button>
          </>
        }
      >
        <Field label="Rule name" required>
          <TextInput value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Description">
          <TextInput value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Module">
            <SelectInput value={form.objectType} onChange={(e) => setForm({ ...form, objectType: e.target.value })}>
              {WORKFLOW_OBJECTS.map((o) => <option key={o} value={o}>{OBJECT_LABELS[o] || o}</option>)}
            </SelectInput>
          </Field>
          <Field label="Trigger">
            <SelectInput value={form.triggerEvent} onChange={(e) => setForm({ ...form, triggerEvent: e.target.value })}>
              {WORKFLOW_EVENTS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </SelectInput>
          </Field>
        </div>
        {form.triggerEvent === 'fieldChanged' && (
          <Field label="Watched fields (comma-separated)">
            <TextInput
              value={(form.watchFields || []).join(', ')}
              onChange={(e) => setForm({ ...form, watchFields: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
        )}

        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Conditions</h3>
          <div className="flex items-center gap-2">
            <select
              value={form.conditionLogic}
              onChange={(e) => setForm({ ...form, conditionLogic: e.target.value })}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option>AND</option>
              <option>OR</option>
            </select>
            <button onClick={addCondition} className="text-xs text-[#0176d3]">+ Add</button>
          </div>
        </div>
        {form.conditions.map((c: any, i: number) => (
          <div key={i} className="grid grid-cols-12 gap-2 mb-2">
            <input
              placeholder="field (e.g. status)"
              value={c.field}
              onChange={(e) => updateCondition(i, { field: e.target.value })}
              className="col-span-4 px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <select
              value={c.operator}
              onChange={(e) => updateCondition(i, { operator: e.target.value })}
              className="col-span-3 px-2 py-1 text-sm border border-gray-300 rounded"
            >
              {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input
              placeholder="value"
              value={c.value || ''}
              onChange={(e) => updateCondition(i, { value: e.target.value })}
              className="col-span-4 px-2 py-1 text-sm border border-gray-300 rounded"
              disabled={['isEmpty', 'isNotEmpty'].includes(c.operator)}
            />
            <button onClick={() => removeCondition(i)} className="col-span-1 text-red-600 text-xs">×</button>
          </div>
        ))}

        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Actions</h3>
          <button onClick={addAction} className="text-xs text-[#0176d3]">+ Add</button>
        </div>
        {form.actions.map((a: any, i: number) => (
          <div key={i} className="border border-gray-200 rounded p-2 mb-2">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={a.type}
                onChange={(e) => updateAction(i, { type: e.target.value, params: {} })}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              >
                {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button onClick={() => removeAction(i)} className="text-red-600 text-xs">Remove</button>
            </div>
            {a.type === 'createActivity' && (
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Subject" value={a.params.subject || ''} onChange={(e) => updateActionParam(i, 'subject', e.target.value)} className="px-2 py-1 text-xs border border-gray-300 rounded" />
                <input type="number" placeholder="Due in days" value={a.params.dueInDays || ''} onChange={(e) => updateActionParam(i, 'dueInDays', e.target.value)} className="px-2 py-1 text-xs border border-gray-300 rounded" />
              </div>
            )}
            {a.type === 'updateField' && (
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Field" value={a.params.field || ''} onChange={(e) => updateActionParam(i, 'field', e.target.value)} className="px-2 py-1 text-xs border border-gray-300 rounded" />
                <input placeholder="Value" value={a.params.value || ''} onChange={(e) => updateActionParam(i, 'value', e.target.value)} className="px-2 py-1 text-xs border border-gray-300 rounded" />
              </div>
            )}
            {a.type === 'assignOwner' && (
              <input placeholder="Owner name" value={a.params.ownerName || ''} onChange={(e) => updateActionParam(i, 'ownerName', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded" />
            )}
            {a.type === 'sendEmail' && (
              <div className="space-y-2">
                <input placeholder="Subject (supports {{firstName}})" value={a.params.subject || ''} onChange={(e) => updateActionParam(i, 'subject', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded" />
                <textarea placeholder="Body" value={a.params.body || ''} onChange={(e) => updateActionParam(i, 'body', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded" rows={3} />
              </div>
            )}
            {a.type === 'escalateCase' && (
              <select value={a.params.priority || ''} onChange={(e) => updateActionParam(i, 'priority', e.target.value)} className="px-2 py-1 text-xs border border-gray-300 rounded">
                <option value="">— set priority —</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            )}
            {a.type === 'webhook' && (
              <input placeholder="https://..." value={a.params.url || ''} onChange={(e) => updateActionParam(i, 'url', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded" />
            )}
          </div>
        ))}
      </Modal>
    </div>
  );
}

/* -------------------- Email Templates -------------------- */

function TemplatesTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/sales-service/email-templates').then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.subject || !form.body) return;
    await fetch('/api/sales-service/email-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setOpen(false); setForm({}); load();
  };
  const remove = async (id: string) => {
    if (!confirm('Delete?')) return;
    await fetch(`/api/sales-service/email-templates?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Email Templates</h2>
          <p className="text-sm text-gray-500">Use {'{{firstName}}'} merge fields in subject &amp; body.</p>
        </div>
        <button onClick={() => setOpen(true)} className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded">+ New</button>
      </div>
      {loading ? <div className="text-sm text-gray-500">Loading…</div> :
        items.length === 0 ? (
          <div className="bg-white border rounded p-8 text-center text-gray-500">No templates yet.</div>
        ) : (
          <div className="space-y-2">
            {items.map((t) => (
              <div key={t._id} className="bg-white border border-gray-200 rounded p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.category || 'Uncategorized'} • {OBJECT_LABELS[t.objectType] || t.objectType || 'Any'}</div>
                    <div className="text-sm text-gray-700 mt-2"><strong>Subject:</strong> {t.subject}</div>
                    <div className="text-sm text-gray-600 mt-1 line-clamp-2 whitespace-pre-wrap">{t.body}</div>
                  </div>
                  <button onClick={() => remove(t._id)} className="text-xs text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      }
      <Modal open={open} onClose={() => setOpen(false)} title="New Email Template"
        footer={<>
          <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded">Cancel</button>
          <button onClick={save} className="px-3 py-1.5 text-sm bg-[#0176d3] text-white rounded">Save</button>
        </>}>
        <Field label="Name" required><TextInput value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><TextInput value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="Module">
            <SelectInput value={form.objectType || ''} onChange={(e) => setForm({ ...form, objectType: e.target.value })}>
              <option value="">Any</option>
              {['Lead', 'Contact', 'Account', 'Opportunity', 'Case'].map((o) => <option key={o} value={o}>{OBJECT_LABELS[o] || o}</option>)}
            </SelectInput>
          </Field>
        </div>
        <Field label="Subject" required><TextInput value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
        <Field label="Body" required><TextArea rows={8} value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
      </Modal>
    </div>
  );
}

/* -------------------- SLAs -------------------- */

function SlasTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ firstResponseMinutes: 60, resolutionMinutes: 1440, businessHoursOnly: true, active: true });

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/sales-service/slas').then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return;
    await fetch('/api/sales-service/slas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setOpen(false); load();
  };
  const remove = async (id: string) => {
    await fetch(`/api/sales-service/slas?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Service Level Agreements</h2>
          <p className="text-sm text-gray-500">Auto-applied to new tickets by priority.</p>
        </div>
        <button onClick={() => setOpen(true)} className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded">+ New SLA</button>
      </div>
      {loading ? <div>Loading…</div> :
        items.length === 0 ? <div className="bg-white border rounded p-8 text-center text-gray-500">No SLAs defined.</div> :
          <div className="space-y-2">
            {items.map((s) => (
              <div key={s._id} className="bg-white border border-gray-200 rounded p-4 flex justify-between">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-gray-500">
                    First response: {s.firstResponseMinutes}m • Resolution: {s.resolutionMinutes}m
                    {s.appliesToPriority?.length > 0 && ` • Priorities: ${s.appliesToPriority.join(', ')}`}
                  </div>
                </div>
                <button onClick={() => remove(s._id)} className="text-xs text-red-600">Delete</button>
              </div>
            ))}
          </div>
      }
      <Modal open={open} onClose={() => setOpen(false)} title="New SLA"
        footer={<>
          <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded">Cancel</button>
          <button onClick={save} className="px-3 py-1.5 text-sm bg-[#0176d3] text-white rounded">Save</button>
        </>}>
        <Field label="Name" required><TextInput value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Description"><TextInput value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Response (minutes)" required>
            <TextInput type="number" value={form.firstResponseMinutes} onChange={(e) => setForm({ ...form, firstResponseMinutes: Number(e.target.value) })} />
          </Field>
          <Field label="Resolution (minutes)" required>
            <TextInput type="number" value={form.resolutionMinutes} onChange={(e) => setForm({ ...form, resolutionMinutes: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="Applies to priorities">
          <div className="flex gap-3 text-sm">
            {['Low', 'Medium', 'High', 'Critical'].map((p) => (
              <label key={p} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={(form.appliesToPriority || []).includes(p)}
                  onChange={(e) => {
                    const current = form.appliesToPriority || [];
                    setForm({
                      ...form,
                      appliesToPriority: e.target.checked ? [...current, p] : current.filter((x: string) => x !== p),
                    });
                  }}
                />
                {p}
              </label>
            ))}
          </div>
        </Field>
      </Modal>
    </div>
  );
}

/* -------------------- Technicians -------------------- */

function TechniciansTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ active: true });

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/sales-service/technicians').then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return;
    await fetch('/api/sales-service/technicians', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        skills: typeof form.skills === 'string' ? form.skills.split(',').map((s: string) => s.trim()) : form.skills,
        territories: typeof form.territories === 'string' ? form.territories.split(',').map((s: string) => s.trim()) : form.territories,
      }),
    });
    setOpen(false); setForm({ active: true }); load();
  };
  const remove = async (id: string) => {
    await fetch(`/api/sales-service/technicians?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Field Technicians</h2>
          <p className="text-sm text-gray-500">Roster used to assign job cards.</p>
        </div>
        <button onClick={() => setOpen(true)} className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded">+ New Technician</button>
      </div>
      {loading ? <div>Loading…</div> :
        items.length === 0 ? <div className="bg-white border rounded p-8 text-center text-gray-500">No technicians yet.</div> :
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((t) => (
              <div key={t._id} className="bg-white border border-gray-200 rounded p-4 flex justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-[#0176d3] text-white flex items-center justify-center font-semibold">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.email || t.phone || '—'}</div>
                    </div>
                  </div>
                  {t.skills?.length > 0 && (
                    <div className="text-xs text-gray-600 mt-2">
                      Skills: {t.skills.join(', ')}
                    </div>
                  )}
                  {t.territories?.length > 0 && (
                    <div className="text-xs text-gray-600">
                      Regions: {t.territories.join(', ')}
                    </div>
                  )}
                </div>
                <button onClick={() => remove(t._id)} className="text-xs text-red-600">Delete</button>
              </div>
            ))}
          </div>
      }
      <Modal open={open} onClose={() => setOpen(false)} title="New Technician"
        footer={<>
          <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded">Cancel</button>
          <button onClick={save} className="px-3 py-1.5 text-sm bg-[#0176d3] text-white rounded">Save</button>
        </>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required><TextInput value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><TextInput value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><TextInput value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Hourly rate (₹)"><TextInput type="number" value={form.hourlyRate || ''} onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Skills (comma-separated)"><TextInput value={form.skills || ''} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></Field>
        <Field label="Regions (comma-separated)"><TextInput value={form.territories || ''} onChange={(e) => setForm({ ...form, territories: e.target.value })} /></Field>
      </Modal>
    </div>
  );
}

/* -------------------- Channels -------------------- */

function ChannelsTab() {
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  const endpoint = `${origin}/api/sales-service/channel-inbound`;
  const exampleCurl = `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "email",
    "fromName": "Jane Doe",
    "fromAddress": "jane@example.com",
    "subject": "Need help with order",
    "body": "My order #1234 has not arrived"
  }'`;

  const webForm = `<form action="${endpoint}" method="POST" enctype="application/x-www-form-urlencoded">
  <input type="hidden" name="channel" value="web" />
  <input type="text" name="fromName" placeholder="Your name" required />
  <input type="email" name="fromAddress" placeholder="Email" required />
  <input type="text" name="subject" placeholder="Subject" />
  <textarea name="body" placeholder="How can we help?" required></textarea>
  <button type="submit">Submit</button>
</form>`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Inbound Channels</h2>
        <p className="text-sm text-gray-500">
          Any message posted to the inbound endpoint becomes a Ticket. Sentiment is auto-analyzed
          and priority is bumped to High when negative or urgent keywords appear.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded p-4">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Inbound endpoint</div>
        <code className="block text-sm font-mono bg-gray-50 p-2 rounded">{endpoint}</code>
      </div>

      <div className="bg-white border border-gray-200 rounded p-4">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Example: cURL</div>
        <pre className="text-xs font-mono bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">{exampleCurl}</pre>
      </div>

      <div className="bg-white border border-gray-200 rounded p-4">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Website ticket form snippet</div>
        <pre className="text-xs font-mono bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">{webForm}</pre>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-900">
        <strong>Supported channels:</strong> email, web, chat, phone, social, sms.
        Forward your inbox or wire your chat widget to POST here.
      </div>
    </div>
  );
}

/* -------------------- Integrations -------------------- */

function SalesIntegrationsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/integrations?app=sales-service').then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (item: any) => {
    await fetch('/api/integrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _id: item._id, active: !item.active }) });
    load();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Integrations</h2>
      <p className="text-sm text-gray-500 mb-4">Connect third-party services. Configure credentials then enable.</p>
      {loading ? <div className="text-gray-500">Loading…</div> : items.length === 0 ? (
        <div className="text-gray-500 text-center py-8">No integrations configured. Run seed-defaults to create default integrations.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((i) => (
            <div key={i._id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{i.name}</span>
                <button onClick={() => toggle(i)} className={`px-2 py-0.5 text-xs rounded ${i.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{i.active ? 'ON' : 'OFF'}</button>
              </div>
              <div className="text-xs text-gray-500 mb-1">{i.type} {i.app === 'global' ? '(Global)' : ''}</div>
              {i.description && <p className="text-xs text-gray-600">{i.description}</p>}
              {i.isDefault && <span className="inline-block mt-2 px-2 py-0.5 text-[10px] bg-blue-50 text-blue-700 rounded">Default</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- App Connections -------------------- */

function SalesConnectionsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [src, tgt] = await Promise.all([
      fetch('/api/connections?sourceApp=sales-service').then((r) => r.json()),
      fetch('/api/connections?targetApp=sales-service').then((r) => r.json()),
    ]);
    const all = [...(Array.isArray(src) ? src : []), ...(Array.isArray(tgt) ? tgt : [])];
    const unique = all.filter((v, i, a) => a.findIndex((t) => t._id === v._id) === i);
    setItems(unique);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (item: any) => {
    await fetch('/api/connections', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _id: item._id, active: !item.active }) });
    load();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">App Connections</h2>
      <p className="text-sm text-gray-500 mb-4">Cross-module data flows involving Sell & Support.</p>
      {loading ? <div className="text-gray-500">Loading…</div> : items.length === 0 ? (
        <div className="text-gray-500 text-center py-8">No connections configured. Run seed-defaults to create default connections.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-2.5">Connection</th>
                <th className="text-left px-4 py-2.5">Source</th>
                <th className="text-left px-4 py-2.5">Target</th>
                <th className="text-center px-4 py-2.5">Active</th>
                <th className="text-right px-4 py-2.5">Runs</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    {c.description && <div className="text-[10px] text-gray-500">{c.description}</div>}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">{c.sourceApp} / {c.sourceObject} / {c.sourceEvent}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">{c.targetApp} / {c.targetAction}</td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => toggle(c)} className={`px-2 py-0.5 text-xs rounded ${c.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{c.active ? 'ON' : 'OFF'}</button>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">{c.runCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
