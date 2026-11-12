'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader,
  Modal,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  PrimaryButton,
  SecondaryButton,
  Badge,
} from '../_components/ui';
import { SubscriptionPlan } from '@/components/SubscriptionPlan';
import { ModuleAccessLink, ModuleObjectManager } from '@/components/platform/ModuleSetupTabs';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = 'general' | 'workflows' | 'integrations' | 'connections' | 'objects' | 'access' | 'subscription';

type WorkflowRule = {
  _id: string;
  name: string;
  objectType: string;
  triggerEvent: string;
  active: boolean;
  isDefault?: boolean;
  runCount?: number;
  description?: string;
};

type Integration = {
  _id: string;
  name: string;
  type: string;
  description?: string;
  active: boolean;
  config?: Record<string, string>;
  app: string;
};

type Connection = {
  _id: string;
  name: string;
  sourceApp: string;
  sourceObject: string;
  sourceEvent: string;
  targetApp: string;
  targetAction: string;
  active: boolean;
  runCount?: number;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'general', label: 'General', desc: 'Fiscal year, currency & tax settings' },
  { id: 'workflows', label: 'Workflows', desc: 'Automate accounting events' },
  { id: 'integrations', label: 'Integrations', desc: 'Third-party apps & services' },
  { id: 'connections', label: 'App Connections', desc: 'Cross-app data flows' },
  { id: 'objects', label: 'Object Manager', desc: 'Objects, fields, rules & page layouts' },
  { id: 'access', label: 'Users & Access', desc: 'Profiles & permission sets' },
  { id: 'subscription', label: 'Subscription & Plan', desc: 'Manage your plan & billing' },
];

const OBJECT_TYPES = ['Transaction', 'Invoice', 'Bill', 'PayrollEntry', 'Asset', 'Budget'];
const TRIGGER_EVENTS = ['created', 'updated', 'fieldChanged', 'overdue', 'paid'];

const emptyForm = {
  name: '',
  objectType: 'Transaction',
  triggerEvent: 'created',
  active: true,
  description: '',
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AccountingSetupPage() {
  const [tab, setTab] = useState<Tab>('general');

  return (
    <>
      <PageHeader title="Setup" subtitle="Accounting" />
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
                  ? 'bg-emerald-50 border-emerald-700 text-emerald-700 font-medium'
                  : 'border-transparent text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div>{t.label}</div>
              <div className="text-[11px] text-gray-500 font-normal mt-0.5">{t.desc}</div>
            </button>
          ))}
        </aside>
        <div className="flex-1 p-6">
          {tab === 'general' && <GeneralTab />}
          {tab === 'workflows' && <WorkflowsTab />}
          {tab === 'integrations' && <IntegrationsTab />}
          {tab === 'connections' && <ConnectionsTab />}
          {tab === 'objects' && <ModuleObjectManager app="accounting" />}
          {tab === 'access' && <ModuleAccessLink app="accounting" />}
          {tab === 'subscription' && <SubscriptionPlan accentColor="#059669" accentBg="#ECFDF5" textColor="#1F2937" mutedColor="#6B7280" borderColor="#E5E7EB" />}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  General Tab                                                        */
/* ------------------------------------------------------------------ */

function GeneralTab() {
  const settings = [
    { label: 'Fiscal Year', value: 'April - March' },
    { label: 'Base Currency', value: 'INR (Indian Rupee)' },
    { label: 'Tax Regime', value: 'New Regime' },
    { label: 'TDS Enabled', value: 'Yes' },
    { label: 'GST Registered', value: 'Yes' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">General Settings</h2>
      <p className="text-sm text-gray-500 mb-4">Core accounting configuration.</p>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {settings.map((s) => (
            <div key={s.label}>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{s.label}</div>
              <div className="text-gray-900 font-medium">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Workflows Tab                                                      */
/* ------------------------------------------------------------------ */

function WorkflowsTab() {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowRule | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/accounting/workflows').then((r) => r.json());
    setRules(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return;
    const method = editing ? 'PATCH' : 'POST';
    const payload = editing ? { _id: editing._id, ...form } : form;
    await fetch('/api/accounting/workflows', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setOpen(false);
    setEditing(null);
    setForm({ ...emptyForm });
    load();
  };

  const toggleWorkflow = async (w: WorkflowRule) => {
    await fetch('/api/accounting/workflows', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: w._id, active: !w.active }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this workflow rule?')) return;
    await fetch(`/api/accounting/workflows?id=${id}`, { method: 'DELETE' });
    load();
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (r: WorkflowRule) => {
    setEditing(r);
    setForm({ name: r.name, objectType: r.objectType, triggerEvent: r.triggerEvent, active: r.active, description: r.description || '' });
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Workflows</h2>
          <p className="text-sm text-gray-500">Automation rules that fire on accounting events.</p>
        </div>
        <PrimaryButton onClick={openCreate}>+ New Rule</PrimaryButton>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Object</th>
              <th className="text-left px-4 py-2.5">Trigger</th>
              <th className="text-center px-4 py-2.5">Active</th>
              <th className="text-left px-4 py-2.5">Default</th>
              <th className="text-right px-4 py-2.5">Runs</th>
              <th className="text-right px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No workflow rules yet.</td></tr>
            ) : rules.map((r) => (
              <tr key={r._id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2">
                  <div className="font-medium text-gray-900">{r.name}</div>
                  {r.description && <div className="text-[10px] text-gray-400 truncate max-w-[220px]">{r.description}</div>}
                </td>
                <td className="px-4 py-2 text-gray-700">{r.objectType}</td>
                <td className="px-4 py-2 text-gray-700">{r.triggerEvent}</td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => toggleWorkflow(r)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${r.active ? 'bg-emerald-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${r.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-2">
                  {r.isDefault && <Badge tone="blue">Default</Badge>}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">{r.runCount ?? 0}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(r)} className="text-xs text-emerald-700 hover:underline mr-3">Edit</button>
                  <button onClick={() => remove(r._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Workflow Rule' : 'New Workflow Rule'} footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save</PrimaryButton></>}>
        <Field label="Name" required>
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Object Type">
          <SelectInput value={form.objectType} onChange={(e) => setForm({ ...form, objectType: e.target.value })}>
            {OBJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
        </Field>
        <Field label="Trigger Event">
          <SelectInput value={form.triggerEvent} onChange={(e) => setForm({ ...form, triggerEvent: e.target.value })}>
            {TRIGGER_EVENTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
        </Field>
        <Field label="Description">
          <TextArea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 mt-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Active
        </label>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Integrations Tab                                                   */
/* ------------------------------------------------------------------ */

function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/integrations?app=accounting').then((r) => r.json());
    setIntegrations(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleIntegration = async (i: Integration) => {
    await fetch('/api/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: i._id, active: !i.active }),
    });
    load();
  };

  const openConfig = (i: Integration) => {
    setEditingIntegration(i);
    setConfigForm({ ...(i.config || {}) });
  };

  const saveConfig = async () => {
    if (!editingIntegration) return;
    await fetch('/api/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: editingIntegration._id, config: configForm }),
    });
    setEditingIntegration(null);
    setConfigForm({});
    load();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Integrations</h2>
      <p className="text-sm text-gray-500 mb-4">Third-party services connected to Accounting.</p>

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : integrations.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          No integrations configured yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {integrations.map((i) => (
            <div key={i._id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-medium text-gray-900">{i.name}</span>
                  <div className="mt-1"><Badge tone={i.type === 'webhook' ? 'blue' : i.type === 'email' ? 'green' : 'gray'}>{i.type}</Badge></div>
                </div>
                <button
                  onClick={() => toggleIntegration(i)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${i.active ? 'bg-emerald-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${i.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {i.description && <p className="text-xs text-gray-500 mb-2">{i.description}</p>}
              {i.active && i.config && Object.keys(i.config).length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  {Object.entries(i.config).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="uppercase tracking-wide text-gray-400">{k}</span>
                      <span className="text-gray-700 truncate max-w-[150px]">{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {i.active && (
                <button onClick={() => openConfig(i)} className="mt-3 text-xs text-emerald-700 hover:underline">
                  Edit Config
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!editingIntegration}
        onClose={() => setEditingIntegration(null)}
        title={`Configure ${editingIntegration?.name ?? ''}`}
        footer={<><SecondaryButton onClick={() => setEditingIntegration(null)}>Cancel</SecondaryButton><PrimaryButton onClick={saveConfig}>Save</PrimaryButton></>}
      >
        {editingIntegration && Object.keys(configForm).length > 0 ? (
          Object.entries(configForm).map(([key, val]) => (
            <Field key={key} label={key}>
              <TextInput value={val} onChange={(e) => setConfigForm({ ...configForm, [key]: e.target.value })} />
            </Field>
          ))
        ) : (
          <div className="space-y-3">
            <Field label="Config Key">
              <TextInput placeholder="e.g. apiKey" onChange={(e) => setConfigForm({ ...configForm, [e.target.value]: '' })} />
            </Field>
            <p className="text-xs text-gray-400">Add configuration keys as needed.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App Connections Tab                                                */
/* ------------------------------------------------------------------ */

function ConnectionsTab() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [src, tgt] = await Promise.all([
      fetch('/api/connections?sourceApp=accounting').then((r) => r.json()),
      fetch('/api/connections?targetApp=accounting').then((r) => r.json()),
    ]);
    const srcArr: Connection[] = Array.isArray(src) ? src : [];
    const tgtArr: Connection[] = Array.isArray(tgt) ? tgt : [];
    const map = new Map<string, Connection>();
    srcArr.forEach((c) => map.set(c._id, c));
    tgtArr.forEach((c) => map.set(c._id, c));
    setConnections(Array.from(map.values()));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleConnection = async (c: Connection) => {
    await fetch('/api/connections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: c._id, active: !c.active }),
    });
    load();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">App Connections</h2>
      <p className="text-sm text-gray-500 mb-4">Cross-app data flows involving Accounting. Connections are managed via seed defaults.</p>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Source</th>
              <th className="text-left px-4 py-2.5">Target</th>
              <th className="text-center px-4 py-2.5">Active</th>
              <th className="text-right px-4 py-2.5">Runs</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : connections.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No app connections found.</td></tr>
            ) : connections.map((c) => (
              <tr key={c._id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-2 text-gray-700">
                  <span className="text-xs font-semibold uppercase text-emerald-700">{c.sourceApp}</span>
                  <span className="text-gray-400 mx-1">&rarr;</span>
                  <span>{c.sourceObject}</span>
                  <span className="text-gray-400 mx-1">&middot;</span>
                  <span className="text-xs text-gray-500">{c.sourceEvent}</span>
                </td>
                <td className="px-4 py-2 text-gray-700">
                  <span className="text-xs font-semibold uppercase text-emerald-700">{c.targetApp}</span>
                  <span className="text-gray-400 mx-1">&rarr;</span>
                  <span>{c.targetAction}</span>
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => toggleConnection(c)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${c.active ? 'bg-emerald-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${c.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">{c.runCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
