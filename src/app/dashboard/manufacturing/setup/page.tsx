'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader, Modal, Field, TextInput, TextArea, SelectInput,
  PrimaryButton, SecondaryButton, Badge,
} from '../_components/ui';
import { SubscriptionPlan } from '@/components/SubscriptionPlan';
import { ModuleAccessLink, ModuleObjectManager } from '@/components/platform/ModuleSetupTabs';

type Tab = 'general' | 'workflows' | 'integrations' | 'connections' | 'objects' | 'access' | 'subscription';

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'general', label: 'General', desc: 'Production unit, shift & quality defaults' },
  { id: 'workflows', label: 'Workflows', desc: 'Automate manufacturing events' },
  { id: 'integrations', label: 'Integrations', desc: 'Third-party apps & services' },
  { id: 'connections', label: 'App Connections', desc: 'Cross-app data flows' },
  { id: 'objects', label: 'Object Manager', desc: 'Objects, fields, rules & page layouts' },
  { id: 'access', label: 'Users & Access', desc: 'Profiles & permission sets' },
  { id: 'subscription', label: 'Subscription & Plan', desc: 'Manage your plan & billing' },
];

export default function ManufacturingSetupPage() {
  const [tab, setTab] = useState<Tab>('general');

  return (
    <>
      <PageHeader title="Setup" subtitle="Customize Manufacturing" />
      <div className="flex">
        <aside className="w-64 bg-white border-r border-[#E5E7EB] min-h-[calc(100vh-7rem)]">
          <div className="p-3 text-xs uppercase tracking-wide text-[#6B7280] font-semibold">
            Customization
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-4 py-2.5 text-sm border-l-2 ${
                tab === t.id
                  ? 'bg-[#F3F4F6] border-[#4A4E54] text-[#1C1C1E] font-medium'
                  : 'border-transparent text-[#4A4E54] hover:bg-[#F9FAFB]'
              }`}
            >
              <div>{t.label}</div>
              <div className="text-[11px] text-[#6B7280] font-normal mt-0.5">{t.desc}</div>
            </button>
          ))}
        </aside>
        <div className="flex-1 p-6">
          {tab === 'general' && <GeneralTab />}
          {tab === 'workflows' && <WorkflowsTab />}
          {tab === 'integrations' && <IntegrationsTab />}
          {tab === 'connections' && <ConnectionsTab />}
          {tab === 'objects' && <ModuleObjectManager app="manufacturing" />}
          {tab === 'access' && <ModuleAccessLink app="manufacturing" />}
          {tab === 'subscription' && <SubscriptionPlan accentColor="#4A4E54" accentBg="#F3F4F6" textColor="#1C1C1E" mutedColor="#6B7280" borderColor="#E5E7EB" />}
        </div>
      </div>
    </>
  );
}

/* -------------------- General -------------------- */

function GeneralTab() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1C1C1E] mb-1">General Settings</h2>
      <p className="text-sm text-[#6B7280] mb-6">Default production configuration for your manufacturing module.</p>

      <div className="space-y-6 max-w-2xl">
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
          <h3 className="text-sm font-semibold text-[#1C1C1E] mb-3">Production Unit</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[#6B7280] block text-xs uppercase tracking-wide mb-1">Unit Name</span>
              <span className="text-[#1C1C1E] font-medium">Main Production Floor</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-xs uppercase tracking-wide mb-1">Location</span>
              <span className="text-[#1C1C1E] font-medium">Factory Block A</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
          <h3 className="text-sm font-semibold text-[#1C1C1E] mb-3">Shift Pattern</h3>
          <div className="border border-[#E5E7EB] rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F3F4F6] text-xs uppercase text-[#6B7280]">
                <tr>
                  <th className="text-left px-4 py-2">Shift</th>
                  <th className="text-left px-4 py-2">Start</th>
                  <th className="text-left px-4 py-2">End</th>
                  <th className="text-left px-4 py-2">Break</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#E5E7EB]">
                  <td className="px-4 py-2 font-medium text-[#1C1C1E]">Morning</td>
                  <td className="px-4 py-2 text-[#4A4E54]">06:00</td>
                  <td className="px-4 py-2 text-[#4A4E54]">14:00</td>
                  <td className="px-4 py-2 text-[#6B7280]">30 min</td>
                </tr>
                <tr className="border-t border-[#E5E7EB]">
                  <td className="px-4 py-2 font-medium text-[#1C1C1E]">Afternoon</td>
                  <td className="px-4 py-2 text-[#4A4E54]">14:00</td>
                  <td className="px-4 py-2 text-[#4A4E54]">22:00</td>
                  <td className="px-4 py-2 text-[#6B7280]">30 min</td>
                </tr>
                <tr className="border-t border-[#E5E7EB]">
                  <td className="px-4 py-2 font-medium text-[#1C1C1E]">Night</td>
                  <td className="px-4 py-2 text-[#4A4E54]">22:00</td>
                  <td className="px-4 py-2 text-[#4A4E54]">06:00</td>
                  <td className="px-4 py-2 text-[#6B7280]">30 min</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
          <h3 className="text-sm font-semibold text-[#1C1C1E] mb-3">Quality Defaults</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[#6B7280] block text-xs uppercase tracking-wide mb-1">Default QC Type</span>
              <span className="text-[#1C1C1E] font-medium">Final</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-xs uppercase tracking-wide mb-1">Defect Tolerance</span>
              <span className="text-[#1C1C1E] font-medium">2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Workflows -------------------- */

const WORKFLOW_OBJECTS = ['WorkOrder', 'BOM', 'Material', 'QualityCheck', 'Machine', 'PurchaseRequisition'];
const WORKFLOW_EVENTS = [
  { value: 'created', label: 'When created' },
  { value: 'updated', label: 'When updated' },
  { value: 'fieldChanged', label: 'When watched field changes' },
  { value: 'completed', label: 'When completed' },
  { value: 'failed', label: 'When failed' },
];

function WorkflowsTab() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: '',
    objectType: 'WorkOrder',
    triggerEvent: 'created',
    active: true,
    description: '',
  });

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/manufacturing/workflows').then((r) => r.json());
    setRules(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setEditing(null);
    setForm({ name: '', objectType: 'WorkOrder', triggerEvent: 'created', active: true, description: '' });
    setOpen(true);
  };

  const startEdit = (r: any) => {
    setEditing(r);
    setForm({ ...r });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name) return;
    if (editing) {
      await fetch('/api/manufacturing/workflows', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...form }),
      });
    } else {
      await fetch('/api/manufacturing/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  const toggle = async (r: any) => {
    await fetch('/api/manufacturing/workflows', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: r._id, active: !r.active }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    await fetch(`/api/manufacturing/workflows?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1C1C1E]">Workflows &amp; Automation</h2>
          <p className="text-sm text-[#6B7280]">Rules fire on manufacturing events.</p>
        </div>
        <PrimaryButton onClick={startCreate}>+ New Workflow</PrimaryButton>
      </div>

      {loading ? (
        <div className="text-sm text-[#6B7280]">Loading...</div>
      ) : rules.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded p-8 text-center text-[#6B7280]">
          No workflows yet.
        </div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F3F4F6] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Object</th>
                <th className="text-left px-4 py-2.5">Trigger</th>
                <th className="text-center px-4 py-2.5">Active</th>
                <th className="text-left px-4 py-2.5">Default</th>
                <th className="text-right px-4 py-2.5">Runs</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r._id} className="border-t border-[#E5E7EB] hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2 font-medium text-[#1C1C1E]">{r.name}</td>
                  <td className="px-4 py-2"><Badge tone="blue">{r.objectType}</Badge></td>
                  <td className="px-4 py-2"><Badge tone="amber">{r.triggerEvent}</Badge></td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => toggle(r)}
                      className={`px-2 py-0.5 text-xs rounded ${r.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {r.active ? 'ON' : 'OFF'}
                    </button>
                  </td>
                  <td className="px-4 py-2">{r.isDefault && <Badge tone="gold">Default</Badge>}</td>
                  <td className="px-4 py-2 text-right text-[#6B7280]">{r.runCount || 0}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(r)} className="text-xs text-[#D4A843] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(r._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'New Workflow'}
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <Field label="Name" required>
          <TextInput value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Object Type">
            <SelectInput value={form.objectType} onChange={(e) => setForm({ ...form, objectType: e.target.value })}>
              {WORKFLOW_OBJECTS.map((o) => <option key={o} value={o}>{o}</option>)}
            </SelectInput>
          </Field>
          <Field label="Trigger Event">
            <SelectInput value={form.triggerEvent} onChange={(e) => setForm({ ...form, triggerEvent: e.target.value })}>
              {WORKFLOW_EVENTS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </SelectInput>
          </Field>
        </div>
        <div className="mt-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
        </div>
        <Field label="Description">
          <TextArea rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
      </Modal>
    </div>
  );
}

/* -------------------- Integrations -------------------- */

function IntegrationsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/integrations?app=manufacturing').then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (item: any) => {
    await fetch('/api/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: item._id, active: !item.active }),
    });
    load();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1C1C1E] mb-1">Integrations</h2>
      <p className="text-sm text-[#6B7280] mb-4">Connect manufacturing tools and third-party services.</p>
      {loading ? (
        <div className="text-[#6B7280]">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-[#6B7280] text-center py-8">No integrations configured. Run seed-defaults to create default integrations.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((i) => (
            <div key={i._id} className="border border-[#E5E7EB] rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[#1C1C1E]">{i.name}</span>
                <button
                  onClick={() => toggle(i)}
                  className={`px-2 py-0.5 text-xs rounded ${i.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                >
                  {i.active ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="text-xs text-[#6B7280] mb-1">{i.type} {i.app === 'global' ? '(Global)' : ''}</div>
              {i.description && <p className="text-xs text-[#4A4E54]">{i.description}</p>}
              {i.isDefault && <Badge tone="gold">Default</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- App Connections -------------------- */

function ConnectionsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [src, tgt] = await Promise.all([
      fetch('/api/connections?sourceApp=manufacturing').then((r) => r.json()),
      fetch('/api/connections?targetApp=manufacturing').then((r) => r.json()),
    ]);
    const all = [...(Array.isArray(src) ? src : []), ...(Array.isArray(tgt) ? tgt : [])];
    const unique = all.filter((v, i, a) => a.findIndex((t) => t._id === v._id) === i);
    setItems(unique);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (item: any) => {
    await fetch('/api/connections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: item._id, active: !item.active }),
    });
    load();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1C1C1E] mb-1">App Connections</h2>
      <p className="text-sm text-[#6B7280] mb-4">Cross-module data flows involving Manufacturing.</p>
      {loading ? (
        <div className="text-[#6B7280]">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-[#6B7280] text-center py-8">No connections configured. Run seed-defaults to create default connections.</div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F3F4F6] text-xs uppercase text-[#6B7280]">
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
                <tr key={c._id} className="border-t border-[#E5E7EB] hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2">
                    <div className="font-medium text-[#1C1C1E]">{c.name}</div>
                    {c.description && <div className="text-[10px] text-[#6B7280]">{c.description}</div>}
                  </td>
                  <td className="px-4 py-2 text-xs text-[#4A4E54]">{c.sourceApp} / {c.sourceObject} / {c.sourceEvent}</td>
                  <td className="px-4 py-2 text-xs text-[#4A4E54]">{c.targetApp} / {c.targetAction}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => toggle(c)}
                      className={`px-2 py-0.5 text-xs rounded ${c.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {c.active ? 'ON' : 'OFF'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right text-[#6B7280]">{c.runCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
