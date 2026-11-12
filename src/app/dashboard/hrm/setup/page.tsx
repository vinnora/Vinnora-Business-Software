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

type Tab = 'departments' | 'leave' | 'attendance' | 'payroll' | 'workflows' | 'integrations' | 'connections' | 'objects' | 'access' | 'subscription';

type Department = {
  _id: string;
  name: string;
  code: string;
  headName: string;
  description: string;
  active: boolean;
  createdAt: string;
};

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
  { id: 'departments', label: 'Departments', desc: 'Organisational departments' },
  { id: 'leave', label: 'Leave Policy', desc: 'Leave types & entitlements' },
  { id: 'attendance', label: 'Attendance', desc: 'Shifts, work hours & grace' },
  { id: 'payroll', label: 'Payroll', desc: 'Statutory deductions & pay day' },
  { id: 'workflows', label: 'Workflows', desc: 'Automate HR events' },
  { id: 'integrations', label: 'Integrations', desc: 'Third-party apps & services' },
  { id: 'connections', label: 'App Connections', desc: 'Cross-app data flows' },
  { id: 'objects', label: 'Object Manager', desc: 'Objects, fields, rules & page layouts' },
  { id: 'access', label: 'Users & Access', desc: 'Profiles & permission sets' },
  { id: 'subscription', label: 'Subscription & Plan', desc: 'Manage your plan & billing' },
];

const WF_OBJECT_TYPES = ['Employee', 'LeaveRequest', 'Attendance', 'JobPosting', 'Applicant', 'PayrollRecord', 'PerformanceReview'];
const WF_TRIGGER_EVENTS = ['created', 'updated', 'fieldChanged', 'approved', 'rejected'];

const emptyDeptForm = { name: '', code: '', headName: '', description: '', active: true };
const emptyWfForm = { name: '', objectType: 'Employee', triggerEvent: 'created', active: true, description: '' };

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HrmSetupPage() {
  const [tab, setTab] = useState<Tab>('departments');

  return (
    <>
      <PageHeader title="Setup" subtitle="HRM" />
      <div className="flex">
        <aside className="w-64 bg-white border-r border-[#E8D5B7] min-h-[calc(100vh-7rem)]">
          <div className="p-3 text-xs uppercase tracking-wide text-[#8B6F47] font-semibold">
            Customization
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-4 py-2.5 text-sm border-l-2 ${
                tab === t.id
                  ? 'bg-[#FAF1E1] border-[#8B6F47] text-[#2C2620] font-medium'
                  : 'border-transparent text-[#6B5841] hover:bg-[#FAF1E1]'
              }`}
            >
              <div>{t.label}</div>
              <div className="text-[11px] text-[#8B6F47] font-normal mt-0.5">{t.desc}</div>
            </button>
          ))}
        </aside>
        <div className="flex-1 p-6">
          {tab === 'departments' && <DepartmentsTab />}
          {tab === 'leave' && <LeavePolicyTab />}
          {tab === 'attendance' && <AttendanceTab />}
          {tab === 'payroll' && <PayrollTab />}
          {tab === 'workflows' && <WorkflowsTab />}
          {tab === 'integrations' && <IntegrationsTab />}
          {tab === 'connections' && <ConnectionsTab />}
          {tab === 'objects' && <ModuleObjectManager app="hrm" />}
          {tab === 'access' && <ModuleAccessLink app="hrm" />}
          {tab === 'subscription' && <SubscriptionPlan accentColor="#8B6F47" accentBg="#FAF1E1" textColor="#2C2620" mutedColor="#8B6F47" borderColor="#E8D5B7" />}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Departments Tab                                                    */
/* ------------------------------------------------------------------ */

function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState<any>({ ...emptyDeptForm });

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/hrm/departments').then((r) => r.json());
    setDepartments(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return;
    const method = editing ? 'PATCH' : 'POST';
    const payload = editing ? { _id: editing._id, ...form } : form;
    await fetch('/api/hrm/departments', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setOpen(false);
    setEditing(null);
    setForm({ ...emptyDeptForm });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this department?')) return;
    await fetch(`/api/hrm/departments?id=${id}`, { method: 'DELETE' });
    load();
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyDeptForm });
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#2C2620]">Departments</h2>
          <p className="text-sm text-[#8B6F47]">Manage organisational departments.</p>
        </div>
        <PrimaryButton onClick={openCreate}>+ New Department</PrimaryButton>
      </div>

      <div className="bg-white border border-[#E8D5B7] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FAF1E1] text-xs uppercase text-[#8B6F47]">
            <tr>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Code</th>
              <th className="text-left px-4 py-2.5">Head</th>
              <th className="text-left px-4 py-2.5">Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8B6F47]">Loading...</td></tr>
            ) : departments.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8B6F47]">No departments yet.</td></tr>
            ) : departments.map((d) => (
              <tr key={d._id} className="border-t border-[#F2E4CF] hover:bg-[#FAF1E1]">
                <td className="px-4 py-2">
                  <div className="font-medium text-[#2C2620]">{d.name}</div>
                  {d.description && <div className="text-[10px] text-[#8B6F47] truncate max-w-[250px]">{d.description}</div>}
                </td>
                <td className="px-4 py-2 text-[#6B5841]">{d.code || '\u2014'}</td>
                <td className="px-4 py-2 text-[#6B5841]">{d.headName || '\u2014'}</td>
                <td className="px-4 py-2"><Badge tone={d.active ? 'green' : 'gray'}>{d.active ? 'Active' : 'Inactive'}</Badge></td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => { setEditing(d); setForm({ ...d }); setOpen(true); }} className="text-xs text-[#8B6F47] hover:underline mr-3">Edit</button>
                  <button onClick={() => remove(d._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Department' : 'New Department'} footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save</PrimaryButton></>}>
        <Field label="Name" required>
          <TextInput value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Code">
          <TextInput value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </Field>
        <Field label="Head Name">
          <TextInput value={form.headName || ''} onChange={(e) => setForm({ ...form, headName: e.target.value })} />
        </Field>
        <Field label="Description">
          <TextArea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 mt-2 text-sm text-[#6B5841]">
          <input type="checkbox" checked={form.active ?? true} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Active
        </label>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Leave Policy Tab                                                   */
/* ------------------------------------------------------------------ */

function LeavePolicyTab() {
  const policies = [
    { label: 'Casual Leave', value: '12 days / year' },
    { label: 'Sick Leave', value: '12 days / year' },
    { label: 'Earned Leave', value: '15 days / year' },
    { label: 'Maternity Leave', value: '26 weeks' },
    { label: 'Paternity Leave', value: '15 days' },
    { label: 'Comp Off', value: 'As earned' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#2C2620] mb-1">Leave Policy</h2>
      <p className="text-sm text-[#8B6F47] mb-4">Standard leave entitlements for all employees.</p>
      <div className="bg-white border border-[#E8D5B7] rounded-lg p-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {policies.map((p) => (
            <div key={p.label}>
              <div className="text-xs uppercase tracking-wide text-[#8B6F47] mb-1">{p.label}</div>
              <div className="text-[#2C2620] font-medium">{p.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Attendance Tab                                                     */
/* ------------------------------------------------------------------ */

function AttendanceTab() {
  const config = [
    { label: 'Work Hours', value: '9 hours' },
    { label: 'Shift Start', value: '09:00 AM' },
    { label: 'Shift End', value: '06:00 PM' },
    { label: 'Week Offs', value: 'Saturday, Sunday' },
    { label: 'Grace Period', value: '15 minutes' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#2C2620] mb-1">Attendance Settings</h2>
      <p className="text-sm text-[#8B6F47] mb-4">Default shift and attendance configuration.</p>
      <div className="bg-white border border-[#E8D5B7] rounded-lg p-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {config.map((c) => (
            <div key={c.label}>
              <div className="text-xs uppercase tracking-wide text-[#8B6F47] mb-1">{c.label}</div>
              <div className="text-[#2C2620] font-medium">{c.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Payroll Tab                                                        */
/* ------------------------------------------------------------------ */

function PayrollTab() {
  const config = [
    { label: 'PF Rate', value: '12%' },
    { label: 'ESI Rate', value: '0.75%' },
    { label: 'Professional Tax', value: '\u20B9200 / month' },
    { label: 'TDS Method', value: 'Slab-based' },
    { label: 'Pay Day', value: 'Last working day' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#2C2620] mb-1">Payroll Settings</h2>
      <p className="text-sm text-[#8B6F47] mb-4">Statutory deductions and payroll configuration.</p>
      <div className="bg-white border border-[#E8D5B7] rounded-lg p-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {config.map((c) => (
            <div key={c.label}>
              <div className="text-xs uppercase tracking-wide text-[#8B6F47] mb-1">{c.label}</div>
              <div className="text-[#2C2620] font-medium">{c.value}</div>
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
  const [form, setForm] = useState<any>({ ...emptyWfForm });

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/hrm/workflows').then((r) => r.json());
    setRules(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return;
    const method = editing ? 'PATCH' : 'POST';
    const payload = editing ? { _id: editing._id, ...form } : form;
    await fetch('/api/hrm/workflows', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setOpen(false);
    setEditing(null);
    setForm({ ...emptyWfForm });
    load();
  };

  const toggleWorkflow = async (w: WorkflowRule) => {
    await fetch('/api/hrm/workflows', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: w._id, active: !w.active }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this workflow rule?')) return;
    await fetch(`/api/hrm/workflows?id=${id}`, { method: 'DELETE' });
    load();
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyWfForm });
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
          <h2 className="text-lg font-semibold text-[#2C2620]">Workflows</h2>
          <p className="text-sm text-[#8B6F47]">Automation rules that fire on HR events.</p>
        </div>
        <PrimaryButton onClick={openCreate}>+ New Rule</PrimaryButton>
      </div>

      <div className="bg-white border border-[#E8D5B7] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FAF1E1] text-xs uppercase text-[#8B6F47]">
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
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8B6F47]">Loading...</td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8B6F47]">No workflow rules yet.</td></tr>
            ) : rules.map((r) => (
              <tr key={r._id} className="border-t border-[#F2E4CF] hover:bg-[#FAF1E1]">
                <td className="px-4 py-2">
                  <div className="font-medium text-[#2C2620]">{r.name}</div>
                  {r.description && <div className="text-[10px] text-[#8B6F47] truncate max-w-[220px]">{r.description}</div>}
                </td>
                <td className="px-4 py-2 text-[#6B5841]">{r.objectType}</td>
                <td className="px-4 py-2 text-[#6B5841]">{r.triggerEvent}</td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => toggleWorkflow(r)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${r.active ? 'bg-[#8B6F47]' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${r.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-2">
                  {r.isDefault && <Badge tone="blue">Default</Badge>}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-[#2C2620]">{r.runCount ?? 0}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(r)} className="text-xs text-[#8B6F47] hover:underline mr-3">Edit</button>
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
            {WF_OBJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
        </Field>
        <Field label="Trigger Event">
          <SelectInput value={form.triggerEvent} onChange={(e) => setForm({ ...form, triggerEvent: e.target.value })}>
            {WF_TRIGGER_EVENTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
        </Field>
        <Field label="Description">
          <TextArea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 mt-2 text-sm text-[#6B5841]">
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
    const data = await fetch('/api/integrations?app=hrm').then((r) => r.json());
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
      <h2 className="text-lg font-semibold text-[#2C2620] mb-1">Integrations</h2>
      <p className="text-sm text-[#8B6F47] mb-4">Third-party services connected to HRM.</p>

      {loading ? (
        <div className="text-sm text-[#8B6F47]">Loading...</div>
      ) : integrations.length === 0 ? (
        <div className="bg-white border border-[#E8D5B7] rounded-lg p-8 text-center text-[#8B6F47]">
          No integrations configured yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {integrations.map((i) => (
            <div key={i._id} className="bg-white border border-[#E8D5B7] rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-medium text-[#2C2620]">{i.name}</span>
                  <div className="mt-1"><Badge tone={i.type === 'webhook' ? 'blue' : i.type === 'email' ? 'green' : 'gray'}>{i.type}</Badge></div>
                </div>
                <button
                  onClick={() => toggleIntegration(i)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${i.active ? 'bg-[#8B6F47]' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${i.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {i.description && <p className="text-xs text-[#8B6F47] mb-2">{i.description}</p>}
              {i.active && i.config && Object.keys(i.config).length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-[#6B5841]">
                  {Object.entries(i.config).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="uppercase tracking-wide text-[#8B6F47]">{k}</span>
                      <span className="text-[#2C2620] truncate max-w-[150px]">{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {i.active && (
                <button onClick={() => openConfig(i)} className="mt-3 text-xs text-[#8B6F47] hover:underline">
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
            <p className="text-xs text-[#8B6F47]">Add configuration keys as needed.</p>
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
      fetch('/api/connections?sourceApp=hrm').then((r) => r.json()),
      fetch('/api/connections?targetApp=hrm').then((r) => r.json()),
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
      <h2 className="text-lg font-semibold text-[#2C2620] mb-1">App Connections</h2>
      <p className="text-sm text-[#8B6F47] mb-4">Cross-app data flows involving HRM. Connections are managed via seed defaults.</p>

      <div className="bg-white border border-[#E8D5B7] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FAF1E1] text-xs uppercase text-[#8B6F47]">
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
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8B6F47]">Loading...</td></tr>
            ) : connections.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8B6F47]">No app connections found.</td></tr>
            ) : connections.map((c) => (
              <tr key={c._id} className="border-t border-[#F2E4CF] hover:bg-[#FAF1E1]">
                <td className="px-4 py-2 font-medium text-[#2C2620]">{c.name}</td>
                <td className="px-4 py-2 text-[#6B5841]">
                  <span className="text-xs font-semibold uppercase text-[#8B6F47]">{c.sourceApp}</span>
                  <span className="text-[#C4A97D] mx-1">&rarr;</span>
                  <span>{c.sourceObject}</span>
                  <span className="text-[#C4A97D] mx-1">&middot;</span>
                  <span className="text-xs text-[#8B6F47]">{c.sourceEvent}</span>
                </td>
                <td className="px-4 py-2 text-[#6B5841]">
                  <span className="text-xs font-semibold uppercase text-[#8B6F47]">{c.targetApp}</span>
                  <span className="text-[#C4A97D] mx-1">&rarr;</span>
                  <span>{c.targetAction}</span>
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => toggleConnection(c)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${c.active ? 'bg-[#8B6F47]' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${c.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-2 text-right font-semibold text-[#2C2620]">{c.runCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
