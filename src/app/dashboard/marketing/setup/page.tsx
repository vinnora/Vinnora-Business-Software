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

type Tab = 'general' | 'email' | 'sms' | 'segments' | 'automations' | 'integrations' | 'connections' | 'objects' | 'access' | 'subscription';

type Segment = {
  _id: string;
  name: string;
  description?: string;
  type: string;
  memberCount: number;
  createdAt: string;
};

type Automation = {
  _id: string;
  name: string;
  trigger: string;
  active: boolean;
  isDefault?: boolean;
  steps?: number;
  enrolled?: number;
  runCount?: number;
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
  { id: 'general', label: 'General', desc: 'Defaults & preferences' },
  { id: 'email', label: 'Email Settings', desc: 'SMTP & delivery config' },
  { id: 'sms', label: 'SMS Settings', desc: 'Sender ID & API provider' },
  { id: 'segments', label: 'Segments', desc: 'Audience segment definitions' },
  { id: 'automations', label: 'Automations', desc: 'Marketing automation rules' },
  { id: 'integrations', label: 'Integrations', desc: 'Third-party apps & services' },
  { id: 'connections', label: 'App Connections', desc: 'Cross-app data flows' },
  { id: 'objects', label: 'Data Model', desc: 'Modules, fields, rules & form layouts' },
  { id: 'access', label: 'Users & Access', desc: 'Roles & access packs' },
  { id: 'subscription', label: 'Subscription & Plan', desc: 'Manage your plan & billing' },
];

const SEG_TYPES = ['Static', 'Dynamic'];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MarketingSetupPage() {
  const [tab, setTab] = useState<Tab>('general');
  // Open the tab named in ?tab= (e.g. when coming back from workspace-wide Settings).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL after hydration
    if (t && TABS.some((x) => x.id === t)) setTab(t as Tab);
  }, []);

  return (
    <>
      <PageHeader title="Settings" subtitle="Marketing" />
      <div className="flex">
        <aside className="w-64 bg-white border-r border-[#D6E5EC] min-h-[calc(100vh-7rem)]">
          <div className="p-3 text-xs uppercase tracking-wide text-[#94A8B8] font-semibold">
            Customization
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-4 py-2.5 text-sm border-l-2 ${
                tab === t.id
                  ? 'bg-[#F4F9FB] border-[#5A7A8C] text-[#3D5266] font-medium'
                  : 'border-transparent text-[#5A7A8C] hover:bg-[#F4F9FB]'
              }`}
            >
              <div>{t.label}</div>
              <div className="text-[11px] text-[#94A8B8] font-normal mt-0.5">{t.desc}</div>
            </button>
          ))}
        </aside>
        <div className="flex-1 p-6">
          {tab === 'general' && <GeneralTab />}
          {tab === 'email' && <EmailSettingsTab />}
          {tab === 'sms' && <SmsSettingsTab />}
          {tab === 'segments' && <SegmentsTab />}
          {tab === 'automations' && <AutomationsTab />}
          {tab === 'integrations' && <IntegrationsTab />}
          {tab === 'connections' && <ConnectionsTab />}
          {tab === 'objects' && <ModuleObjectManager app="marketing" />}
          {tab === 'access' && <ModuleAccessLink app="marketing" />}
          {tab === 'subscription' && <SubscriptionPlan accentColor="#5A7A8C" accentBg="#F4F9FB" textColor="#3D5266" mutedColor="#94A8B8" borderColor="#D6E5EC" />}
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
    { label: 'Default From Name', value: 'Vinnora Marketing' },
    { label: 'Default From Email', value: 'marketing@vinnora.com' },
    { label: 'Timezone', value: 'Asia/Kolkata (IST)' },
    { label: 'Unsubscribe Link', value: 'https://vinnora.com/unsubscribe?token={{token}}' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#3D5266] mb-1">General Settings</h2>
      <p className="text-sm text-[#94A8B8] mb-4">Core marketing defaults.</p>
      <div className="bg-white border border-[#D6E5EC] rounded-lg p-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {settings.map((s) => (
            <div key={s.label}>
              <div className="text-xs uppercase tracking-wide text-[#94A8B8] mb-1">{s.label}</div>
              <div className="text-[#3D5266] font-medium">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Email Settings Tab                                                 */
/* ------------------------------------------------------------------ */

function EmailSettingsTab() {
  const config = [
    { label: 'SMTP Host', value: 'smtp.vinnora.com' },
    { label: 'SMTP Port', value: '587' },
    { label: 'Username', value: 'marketing@vinnora.com' },
    { label: 'Password', value: '********' },
    { label: 'From Address', value: 'marketing@vinnora.com' },
    { label: 'Reply-To', value: 'reply@vinnora.com' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#3D5266] mb-1">Email Settings</h2>
      <p className="text-sm text-[#94A8B8] mb-4">SMTP configuration for outbound emails.</p>
      <div className="bg-white border border-[#D6E5EC] rounded-lg p-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {config.map((c) => (
            <div key={c.label}>
              <div className="text-xs uppercase tracking-wide text-[#94A8B8] mb-1">{c.label}</div>
              <div className="text-[#3D5266] font-medium">{c.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SMS Settings Tab                                                   */
/* ------------------------------------------------------------------ */

function SmsSettingsTab() {
  const config = [
    { label: 'Sender ID', value: 'VINNORA' },
    { label: 'API Provider', value: 'MSG91' },
    { label: 'API Key', value: '••••••••••••••••' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#3D5266] mb-1">SMS Settings</h2>
      <p className="text-sm text-[#94A8B8] mb-4">SMS gateway configuration.</p>
      <div className="bg-white border border-[#D6E5EC] rounded-lg p-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {config.map((c) => (
            <div key={c.label}>
              <div className="text-xs uppercase tracking-wide text-[#94A8B8] mb-1">{c.label}</div>
              <div className="text-[#3D5266] font-medium">{c.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Segments Tab                                                       */
/* ------------------------------------------------------------------ */

function SegmentsTab() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Segment | null>(null);
  const [form, setForm] = useState<any>({ name: '', description: '', type: 'Dynamic' });

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/marketing/segments').then((r) => r.json());
    setSegments(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return;
    const method = editing ? 'PATCH' : 'POST';
    const payload = editing ? { _id: editing._id, ...form } : form;
    const res = await fetch('/api/marketing/segments', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { alert((await res.json().catch(() => ({}))).error || 'Could not save'); return; }
    setOpen(false);
    setEditing(null);
    setForm({ name: '', description: '', type: 'Dynamic' });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this segment?')) return;
    const res = await fetch(`/api/marketing/segments?id=${id}`, { method: 'DELETE' });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || 'Could not delete');
    load();
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', type: 'Dynamic' });
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#3D5266]">Audience Segments</h2>
          <p className="text-sm text-[#94A8B8]">Define and manage audience groups.</p>
        </div>
        <PrimaryButton onClick={openCreate}>+ New Segment</PrimaryButton>
      </div>

      <div className="bg-white border border-[#D6E5EC] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F4F9FB] text-xs uppercase text-[#5A7A8C]">
            <tr>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Type</th>
              <th className="text-right px-4 py-2.5">Members</th>
              <th className="text-left px-4 py-2.5">Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#94A8B8]">Loading...</td></tr>
            ) : segments.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#94A8B8]">No segments yet.</td></tr>
            ) : segments.map((s) => (
              <tr key={s._id} className="border-t border-[#E8F1F5] hover:bg-[#F4F9FB]">
                <td className="px-4 py-2">
                  <div className="font-medium text-[#3D5266]">{s.name}</div>
                  {s.description && <div className="text-[10px] text-[#94A8B8] truncate max-w-[250px]">{s.description}</div>}
                </td>
                <td className="px-4 py-2"><Badge tone={s.type === 'Dynamic' ? 'blue' : 'gray'}>{s.type}</Badge></td>
                <td className="px-4 py-2 text-right font-semibold text-[#3D5266]">{s.memberCount}</td>
                <td className="px-4 py-2 text-xs text-[#94A8B8]">{new Date(s.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => { setEditing(s); setForm({ ...s }); setOpen(true); }} className="text-xs text-[#5A7A8C] hover:underline mr-3">Edit</button>
                  <button onClick={() => remove(s._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Segment' : 'New Segment'} footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save</PrimaryButton></>}>
        <Field label="Name" required>
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Type">
          <SelectInput value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {SEG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
        </Field>
        <Field label="Description">
          <TextArea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Automations Tab                                                    */
/* ------------------------------------------------------------------ */

function AutomationsTab() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/marketing/automation').then((r) => r.json());
    setAutomations(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleAutomation = async (a: Automation) => {
    const res = await fetch('/api/marketing/automation', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: a._id, active: !a.active }),
    });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || 'Could not save');
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this automation?')) return;
    const res = await fetch(`/api/marketing/automation?id=${id}`, { method: 'DELETE' });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || 'Could not delete');
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#3D5266]">Automations</h2>
          <p className="text-sm text-[#94A8B8]">Marketing automation rules. Click a name to edit the full workflow.</p>
        </div>
      </div>

      <div className="bg-white border border-[#D6E5EC] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F4F9FB] text-xs uppercase text-[#5A7A8C]">
            <tr>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Trigger</th>
              <th className="text-center px-4 py-2.5">Active</th>
              <th className="text-left px-4 py-2.5">Default</th>
              <th className="text-right px-4 py-2.5">Steps</th>
              <th className="text-right px-4 py-2.5">Enrolled</th>
              <th className="text-right px-4 py-2.5">Runs</th>
              <th className="text-right px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#94A8B8]">Loading...</td></tr>
            ) : automations.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#94A8B8]">No automations yet.</td></tr>
            ) : automations.map((a) => (
              <tr key={a._id} className="border-t border-[#E8F1F5] hover:bg-[#F4F9FB]">
                <td className="px-4 py-2">
                  <a href={`/dashboard/marketing/automation/${a._id}`} className="font-medium text-[#5A7A8C] hover:underline">{a.name}</a>
                </td>
                <td className="px-4 py-2 text-[#3D5266]">{a.trigger}</td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => toggleAutomation(a)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${a.active ? 'bg-[#5A7A8C]' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${a.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-2">
                  {a.isDefault && <Badge tone="blue">Default</Badge>}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-[#3D5266]">{a.steps ?? 0}</td>
                <td className="px-4 py-2 text-right font-semibold text-[#3D5266]">{a.enrolled ?? 0}</td>
                <td className="px-4 py-2 text-right font-semibold text-[#3D5266]">{a.runCount ?? 0}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <a href={`/dashboard/marketing/automation/${a._id}`} className="text-xs text-[#5A7A8C] hover:underline mr-3">Edit</a>
                  <button onClick={() => remove(a._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    const data = await fetch('/api/integrations?app=marketing').then((r) => r.json());
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
      <h2 className="text-lg font-semibold text-[#3D5266] mb-1">Integrations</h2>
      <p className="text-sm text-[#94A8B8] mb-4">Third-party services connected to Marketing.</p>

      {loading ? (
        <div className="text-sm text-[#94A8B8]">Loading...</div>
      ) : integrations.length === 0 ? (
        <div className="bg-white border border-[#D6E5EC] rounded-lg p-8 text-center text-[#94A8B8]">
          No integrations configured yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {integrations.map((i) => (
            <div key={i._id} className="bg-white border border-[#D6E5EC] rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-medium text-[#3D5266]">{i.name}</span>
                  <div className="mt-1"><Badge tone={i.type === 'webhook' ? 'blue' : i.type === 'email' ? 'green' : 'gray'}>{i.type}</Badge></div>
                </div>
                <button
                  onClick={() => toggleIntegration(i)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${i.active ? 'bg-[#5A7A8C]' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${i.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {i.description && <p className="text-xs text-[#94A8B8] mb-2">{i.description}</p>}
              {i.active && i.config && Object.keys(i.config).length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-[#5A7A8C]">
                  {Object.entries(i.config).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="uppercase tracking-wide text-[#94A8B8]">{k}</span>
                      <span className="text-[#3D5266] truncate max-w-[150px]">{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {i.active && (
                <button onClick={() => openConfig(i)} className="mt-3 text-xs text-[#5A7A8C] hover:underline">
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
            <p className="text-xs text-[#94A8B8]">Add configuration keys as needed.</p>
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
      fetch('/api/connections?sourceApp=marketing').then((r) => r.json()),
      fetch('/api/connections?targetApp=marketing').then((r) => r.json()),
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
      <h2 className="text-lg font-semibold text-[#3D5266] mb-1">App Connections</h2>
      <p className="text-sm text-[#94A8B8] mb-4">Cross-app data flows involving Marketing. Connections are managed via seed defaults.</p>

      <div className="bg-white border border-[#D6E5EC] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F4F9FB] text-xs uppercase text-[#5A7A8C]">
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
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#94A8B8]">Loading...</td></tr>
            ) : connections.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#94A8B8]">No app connections found.</td></tr>
            ) : connections.map((c) => (
              <tr key={c._id} className="border-t border-[#E8F1F5] hover:bg-[#F4F9FB]">
                <td className="px-4 py-2 font-medium text-[#3D5266]">{c.name}</td>
                <td className="px-4 py-2 text-[#3D5266]">
                  <span className="text-xs font-semibold uppercase text-[#5A7A8C]">{c.sourceApp}</span>
                  <span className="text-[#94A8B8] mx-1">&rarr;</span>
                  <span>{c.sourceObject}</span>
                  <span className="text-[#94A8B8] mx-1">&middot;</span>
                  <span className="text-xs text-[#94A8B8]">{c.sourceEvent}</span>
                </td>
                <td className="px-4 py-2 text-[#3D5266]">
                  <span className="text-xs font-semibold uppercase text-[#5A7A8C]">{c.targetApp}</span>
                  <span className="text-[#94A8B8] mx-1">&rarr;</span>
                  <span>{c.targetAction}</span>
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => toggleConnection(c)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${c.active ? 'bg-[#5A7A8C]' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${c.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-2 text-right font-semibold text-[#3D5266]">{c.runCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
