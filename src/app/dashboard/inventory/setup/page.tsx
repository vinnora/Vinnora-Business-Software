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

type Tab =
  | 'picklists'
  | 'reorder-rules'
  | 'workflows'
  | 'units'
  | 'hsn'
  | 'barcode-defaults'
  | 'eway-defaults'
  | 'integrations'
  | 'connections'
  | 'objects' | 'access' | 'subscription';

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'picklists', label: 'Picklists', desc: 'Categories, brands, units, statuses' },
  { id: 'reorder-rules', label: 'Reorder Rules', desc: 'Auto-create POs when stock is low' },
  { id: 'workflows', label: 'Workflows', desc: 'Automate inventory events' },
  { id: 'units', label: 'Units of Measure', desc: 'Custom units for items' },
  { id: 'hsn', label: 'HSN Codes', desc: 'Tax classification' },
  { id: 'barcode-defaults', label: 'Barcode Defaults', desc: 'Default formats and prefixes' },
  { id: 'eway-defaults', label: 'E-Way Defaults', desc: 'Default consignor / GSTIN' },
  { id: 'integrations', label: 'Integrations', desc: 'Third-party apps & services' },
  { id: 'connections', label: 'App Connections', desc: 'Cross-app data flows' },
  { id: 'objects', label: 'Object Manager', desc: 'Objects, fields, rules & page layouts' },
  { id: 'access', label: 'Users & Access', desc: 'Profiles & permission sets' },
  { id: 'subscription', label: 'Subscription & Plan', desc: 'Manage your plan & billing' },
];

export default function InventorySetupPage() {
  const [tab, setTab] = useState<Tab>('picklists');

  return (
    <>
      <PageHeader title="Setup" subtitle="Customize Inventory" />
      <div className="flex">
        <aside className="w-64 bg-white border-r border-[#FFE5C4] min-h-[calc(100vh-7rem)]">
          <div className="p-3 text-xs uppercase tracking-wide text-[#A0522D] font-semibold">
            Customization
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-4 py-2.5 text-sm border-l-2 ${
                tab === t.id
                  ? 'bg-[#FFF6E5] border-[#E2671A] text-[#4A1D0F] font-medium'
                  : 'border-transparent text-[#6B2410] hover:bg-[#FFF6E5]'
              }`}
            >
              <div>{t.label}</div>
              <div className="text-[11px] text-[#A0522D] font-normal mt-0.5">{t.desc}</div>
            </button>
          ))}
        </aside>
        <div className="flex-1 p-6">
          {tab === 'picklists' && <PicklistsTab />}
          {tab === 'reorder-rules' && <ReorderRulesTab />}
          {tab === 'workflows' && <WorkflowsTab />}
          {tab === 'units' && <PicklistsTab keyOverride="item.unit" title="Units of Measure" />}
          {tab === 'hsn' && <HsnTab />}
          {tab === 'barcode-defaults' && <BarcodeDefaultsTab />}
          {tab === 'eway-defaults' && <EwayDefaultsTab />}
          {tab === 'integrations' && <InvIntegrationsTab />}
          {tab === 'connections' && <InvConnectionsTab />}
          {tab === 'objects' && <ModuleObjectManager app="inventory" />}
          {tab === 'access' && <ModuleAccessLink app="inventory" />}
          {tab === 'subscription' && <SubscriptionPlan accentColor="#E2671A" accentBg="#FFF6E5" textColor="#4A1D0F" mutedColor="#A0522D" borderColor="#FFE5C4" />}
        </div>
      </div>
    </>
  );
}

/* -------------------- Picklists -------------------- */

const PICKLIST_KEYS = [
  { key: 'item.category', label: 'Item Categories' },
  { key: 'item.brand', label: 'Brands' },
  { key: 'item.unit', label: 'Units of Measure' },
  { key: 'item.type', label: 'Item Types' },
  { key: 'item.status', label: 'Item Statuses' },
  { key: 'warehouse.type', label: 'Warehouse Types' },
  { key: 'supplier.paymentTerms', label: 'Payment Terms' },
  { key: 'po.status', label: 'PO Statuses' },
];

function PicklistsTab({ keyOverride, title }: { keyOverride?: string; title?: string }) {
  const [selectedKey, setSelectedKey] = useState(keyOverride || PICKLIST_KEYS[0].key);
  const [values, setValues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await fetch(`/api/inventory/settings?key=${selectedKey}`).then((r) => r.json());
    setValues(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [selectedKey]);

  const add = async () => {
    if (!newValue) return;
    await fetch('/api/inventory/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        picklistKey: selectedKey,
        value: newValue,
        label: newValue,
        order: values.length,
      }),
    });
    setNewValue('');
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/inventory/settings?id=${id}`, { method: 'DELETE' });
    load();
  };

  const toggle = async (v: any) => {
    await fetch('/api/inventory/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: v._id, active: !v.active }),
    });
    load();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#4A1D0F] mb-1">{title || 'Picklist Values'}</h2>
      <p className="text-sm text-[#A0522D] mb-4">
        Customize dropdown options used across the inventory module.
      </p>
      <div className={`grid ${keyOverride ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
        {!keyOverride && (
          <div className="col-span-1 bg-white border border-[#FFE5C4] rounded">
            {PICKLIST_KEYS.map((k) => (
              <button
                key={k.key}
                onClick={() => setSelectedKey(k.key)}
                className={`w-full text-left px-3 py-2 text-sm border-b border-[#FFF1D6] ${
                  selectedKey === k.key ? 'bg-[#FFF6E5] text-[#4A1D0F]' : 'hover:bg-[#FFF6E5]'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        )}
        <div className={`${keyOverride ? 'col-span-1' : 'col-span-2'} bg-white border border-[#FFE5C4] rounded p-4`}>
          <div className="flex gap-2 mb-4">
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="New value…"
              className="flex-1 px-3 py-1.5 text-sm border border-[#FFE5C4] rounded"
            />
            <PrimaryButton onClick={add}>Add</PrimaryButton>
          </div>
          {loading ? (
            <div className="text-sm text-[#A0522D]">Loading…</div>
          ) : values.length === 0 ? (
            <div className="text-sm text-[#A0522D]">No custom values yet. Defaults will be used.</div>
          ) : (
            <ul className="space-y-1">
              {values.map((v) => (
                <li
                  key={v._id}
                  className="flex items-center gap-2 px-3 py-2 border border-[#FFF1D6] rounded"
                >
                  <span className={`flex-1 text-sm ${!v.active && 'text-[#A0522D] line-through'}`}>
                    {v.label}
                  </span>
                  <button onClick={() => toggle(v)} className="text-xs text-[#A0522D] hover:text-[#4A1D0F]">
                    {v.active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => remove(v._id)} className="text-xs text-red-600">
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Reorder Rules -------------------- */

const STRATEGIES = ['fixed', 'consumption-based', 'demand-forecast', 'economic-order'];
const FREQUENCIES = ['on-trigger', 'daily', 'weekly', 'monthly'];
const APPLIES_TO = ['all', 'category', 'item'];

function ReorderRulesTab() {
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty());

  function empty() {
    return {
      appliesTo: 'all',
      strategy: 'fixed',
      reorderPoint: 10,
      reorderQuantity: 50,
      frequency: 'on-trigger',
      autoCreatePO: false,
      requireApproval: true,
      active: true,
    };
  }

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/inventory/reorder-rules').then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetch('/api/inventory/suppliers')
      .then((r) => r.json())
      .then((d) => setSuppliers(Array.isArray(d) ? d : []));
  }, []);

  const save = async () => {
    if (!form.name) return;
    const supplier = suppliers.find((s) => s._id === form.preferredSupplierId);
    await fetch('/api/inventory/reorder-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, preferredSupplierName: supplier?.name }),
    });
    setOpen(false);
    setForm(empty());
    load();
  };

  const runRule = async (id: string) => {
    if (!confirm('Run this rule now? It will create POs for items below the reorder point.')) return;
    const res = await fetch('/api/inventory/reorder-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run', ruleId: id }),
    }).then((r) => r.json());
    alert(`${res.ordersCreated || 0} purchase orders created.`);
    load();
  };

  const toggle = async (r: any) => {
    await fetch('/api/inventory/reorder-rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: r._id, active: !r.active }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete?')) return;
    await fetch(`/api/inventory/reorder-rules?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#4A1D0F]">Reorder Rules</h2>
          <p className="text-sm text-[#A0522D]">Auto-create purchase orders when stock falls below thresholds.</p>
        </div>
        <PrimaryButton onClick={() => setOpen(true)}>+ New Rule</PrimaryButton>
      </div>

      {loading ? (
        <div className="text-sm text-[#A0522D]">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#FFE5C4] rounded p-8 text-center text-[#A0522D]">
          No reorder rules yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div
              key={r._id}
              className="bg-white border border-[#FFE5C4] rounded p-4 flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${r.active ? 'bg-green-500' : 'bg-gray-300'}`}
                  />
                  <span className="font-semibold text-[#4A1D0F]">{r.name}</span>
                  <Badge tone="fire">{r.strategy}</Badge>
                  <Badge tone="amber">{r.frequency}</Badge>
                </div>
                {r.description && <div className="text-sm text-[#6B2410] mt-1">{r.description}</div>}
                <div className="text-xs text-[#A0522D] mt-2">
                  Applies to: <strong>{r.appliesTo}</strong>
                  {r.categoryFilter && ` • Category: ${r.categoryFilter}`}
                  {' • '}Reorder when ≤ {r.reorderPoint}, order {r.reorderQuantity}
                  {' • '}Run {r.triggerCount || 0}×
                  {r.lastTriggeredAt && ` • last ${new Date(r.lastTriggeredAt).toLocaleString()}`}
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => runRule(r._id)} className="text-[#E2671A] hover:underline">
                  Run now
                </button>
                <button onClick={() => toggle(r)} className="text-[#6B2410]">
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
        title="New Reorder Rule"
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
        <Field label="Description">
          <TextInput value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Applies To">
            <SelectInput value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}>
              {APPLIES_TO.map((a) => <option key={a}>{a}</option>)}
            </SelectInput>
          </Field>
          <Field label="Strategy">
            <SelectInput value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })}>
              {STRATEGIES.map((s) => <option key={s}>{s}</option>)}
            </SelectInput>
          </Field>
          {form.appliesTo === 'category' && (
            <div className="col-span-2">
              <Field label="Category">
                <TextInput value={form.categoryFilter || ''} onChange={(e) => setForm({ ...form, categoryFilter: e.target.value })} />
              </Field>
            </div>
          )}
          <Field label="Reorder Point" required>
            <TextInput type="number" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: Number(e.target.value) })} />
          </Field>
          <Field label="Reorder Quantity" required>
            <TextInput type="number" value={form.reorderQuantity} onChange={(e) => setForm({ ...form, reorderQuantity: Number(e.target.value) })} />
          </Field>
          <Field label="Max Stock">
            <TextInput type="number" value={form.maxStock || ''} onChange={(e) => setForm({ ...form, maxStock: Number(e.target.value) })} />
          </Field>
          <Field label="Safety Stock (days)">
            <TextInput type="number" value={form.safetyStockDays || 7} onChange={(e) => setForm({ ...form, safetyStockDays: Number(e.target.value) })} />
          </Field>
          <Field label="Preferred Supplier">
            <SelectInput value={form.preferredSupplierId || ''} onChange={(e) => setForm({ ...form, preferredSupplierId: e.target.value })}>
              <option value="">— Auto-pick —</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Frequency">
            <SelectInput value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
            </SelectInput>
          </Field>
        </div>
        <div className="flex flex-col gap-2 mt-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.autoCreatePO} onChange={(e) => setForm({ ...form, autoCreatePO: e.target.checked })} />
            Automatically create PO on trigger
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.requireApproval} onChange={(e) => setForm({ ...form, requireApproval: e.target.checked })} />
            Require approval (PO created as draft)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
        </div>
      </Modal>
    </div>
  );
}

/* -------------------- Workflows -------------------- */

const WORKFLOW_OBJECTS = ['Item', 'PurchaseOrder', 'StockTransfer', 'StockAudit', 'WarehouseStock'];
const WORKFLOW_EVENTS = [
  { value: 'created', label: 'When created' },
  { value: 'updated', label: 'When updated' },
  { value: 'fieldChanged', label: 'When watched field changes' },
  { value: 'lowStock', label: 'When stock falls to reorder point' },
  { value: 'outOfStock', label: 'When stock hits zero' },
  { value: 'expiringSoon', label: 'When expiring within 30 days' },
  { value: 'received', label: 'When received' },
  { value: 'shipped', label: 'When shipped' },
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
  { value: 'createPurchaseOrder', label: 'Create Purchase Order' },
  { value: 'createStockTransfer', label: 'Create Stock Transfer' },
  { value: 'createStockAudit', label: 'Create Stock Audit' },
  { value: 'updateField', label: 'Update field' },
  { value: 'sendAlert', label: 'Send alert' },
  { value: 'sendEmail', label: 'Send email' },
  { value: 'webhook', label: 'Outbound webhook' },
  { value: 'logEvent', label: 'Log event' },
];

function WorkflowsTab() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    objectType: 'Item',
    triggerEvent: 'lowStock',
    conditionLogic: 'AND',
    conditions: [],
    actions: [],
    active: true,
  });

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/inventory/workflows').then((r) => r.json());
    setRules(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.name) return;
    await fetch('/api/inventory/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setOpen(false);
    setForm({
      objectType: 'Item',
      triggerEvent: 'lowStock',
      conditionLogic: 'AND',
      conditions: [],
      actions: [],
      active: true,
    });
    load();
  };

  const toggle = async (r: any) => {
    await fetch('/api/inventory/workflows', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: r._id, active: !r.active }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete?')) return;
    await fetch(`/api/inventory/workflows?id=${id}`, { method: 'DELETE' });
    load();
  };

  const addCondition = () =>
    setForm({ ...form, conditions: [...form.conditions, { field: '', operator: 'equals', value: '' }] });
  const updateCondition = (i: number, patch: any) =>
    setForm({ ...form, conditions: form.conditions.map((c: any, idx: number) => (idx === i ? { ...c, ...patch } : c)) });
  const removeCondition = (i: number) =>
    setForm({ ...form, conditions: form.conditions.filter((_: any, idx: number) => idx !== i) });

  const addAction = () =>
    setForm({ ...form, actions: [...form.actions, { type: 'sendAlert', params: {} }] });
  const updateActionParam = (i: number, key: string, value: any) =>
    setForm({
      ...form,
      actions: form.actions.map((a: any, idx: number) =>
        idx === i ? { ...a, params: { ...a.params, [key]: value } } : a
      ),
    });
  const updateAction = (i: number, patch: any) =>
    setForm({ ...form, actions: form.actions.map((a: any, idx: number) => (idx === i ? { ...a, ...patch } : a)) });
  const removeAction = (i: number) =>
    setForm({ ...form, actions: form.actions.filter((_: any, idx: number) => idx !== i) });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#4A1D0F]">Workflows &amp; Automation</h2>
          <p className="text-sm text-[#A0522D]">Rules fire on inventory events. Use {'{{field}}'} merge fields in actions.</p>
        </div>
        <PrimaryButton onClick={() => setOpen(true)}>+ New Rule</PrimaryButton>
      </div>

      {loading ? (
        <div className="text-sm text-[#A0522D]">Loading…</div>
      ) : rules.length === 0 ? (
        <div className="bg-white border border-[#FFE5C4] rounded p-8 text-center text-[#A0522D]">
          No automation rules yet.
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div
              key={r._id}
              className="bg-white border border-[#FFE5C4] rounded p-4 flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${r.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="font-semibold text-[#4A1D0F]">{r.name}</span>
                  <Badge tone="fire">{r.objectType}</Badge>
                  <Badge tone="amber">{r.triggerEvent}</Badge>
                </div>
                {r.description && <div className="text-sm text-[#6B2410] mt-1">{r.description}</div>}
                <div className="text-xs text-[#A0522D] mt-2">
                  {r.conditions.length} conditions • {r.actions.length} actions • Run {r.runCount || 0}×
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => toggle(r)} className="text-[#6B2410]">
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
        width="max-w-3xl"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
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
          <Field label="Object">
            <SelectInput value={form.objectType} onChange={(e) => setForm({ ...form, objectType: e.target.value })}>
              {WORKFLOW_OBJECTS.map((o) => <option key={o}>{o}</option>)}
            </SelectInput>
          </Field>
          <Field label="Trigger">
            <SelectInput value={form.triggerEvent} onChange={(e) => setForm({ ...form, triggerEvent: e.target.value })}>
              {WORKFLOW_EVENTS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </SelectInput>
          </Field>
        </div>

        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#4A1D0F]">Conditions</h3>
          <div className="flex items-center gap-2">
            <select
              value={form.conditionLogic}
              onChange={(e) => setForm({ ...form, conditionLogic: e.target.value })}
              className="text-xs border border-[#FFE5C4] rounded px-2 py-1"
            >
              <option>AND</option>
              <option>OR</option>
            </select>
            <button onClick={addCondition} className="text-xs text-[#E2671A]">+ Add</button>
          </div>
        </div>
        {form.conditions.map((c: any, i: number) => (
          <div key={i} className="grid grid-cols-12 gap-2 mb-2">
            <input
              placeholder="field"
              value={c.field}
              onChange={(e) => updateCondition(i, { field: e.target.value })}
              className="col-span-4 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
            />
            <select
              value={c.operator}
              onChange={(e) => updateCondition(i, { operator: e.target.value })}
              className="col-span-3 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
            >
              {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input
              placeholder="value"
              value={c.value || ''}
              onChange={(e) => updateCondition(i, { value: e.target.value })}
              className="col-span-4 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
            />
            <button onClick={() => removeCondition(i)} className="col-span-1 text-red-600 text-xs">×</button>
          </div>
        ))}

        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#4A1D0F]">Actions</h3>
          <button onClick={addAction} className="text-xs text-[#E2671A]">+ Add</button>
        </div>
        {form.actions.map((a: any, i: number) => (
          <div key={i} className="border border-[#FFE5C4] rounded p-2 mb-2">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={a.type}
                onChange={(e) => updateAction(i, { type: e.target.value, params: {} })}
                className="flex-1 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
              >
                {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button onClick={() => removeAction(i)} className="text-red-600 text-xs">Remove</button>
            </div>
            {a.type === 'createPurchaseOrder' && (
              <input
                type="number"
                placeholder="Quantity (default: reorderQuantity)"
                value={a.params.quantity || ''}
                onChange={(e) => updateActionParam(i, 'quantity', Number(e.target.value))}
                className="w-full px-2 py-1 text-xs border border-[#FFE5C4] rounded"
              />
            )}
            {a.type === 'sendAlert' && (
              <input
                placeholder="Message (e.g. {{name}} is below reorder point)"
                value={a.params.message || ''}
                onChange={(e) => updateActionParam(i, 'message', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-[#FFE5C4] rounded"
              />
            )}
            {a.type === 'sendEmail' && (
              <div className="space-y-2">
                <input
                  placeholder="To"
                  value={a.params.to || ''}
                  onChange={(e) => updateActionParam(i, 'to', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-[#FFE5C4] rounded"
                />
                <input
                  placeholder="Subject"
                  value={a.params.subject || ''}
                  onChange={(e) => updateActionParam(i, 'subject', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-[#FFE5C4] rounded"
                />
                <textarea
                  placeholder="Body"
                  value={a.params.body || ''}
                  onChange={(e) => updateActionParam(i, 'body', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-[#FFE5C4] rounded"
                  rows={2}
                />
              </div>
            )}
            {a.type === 'webhook' && (
              <input
                placeholder="https://..."
                value={a.params.url || ''}
                onChange={(e) => updateActionParam(i, 'url', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-[#FFE5C4] rounded"
              />
            )}
            {a.type === 'updateField' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Field"
                  value={a.params.field || ''}
                  onChange={(e) => updateActionParam(i, 'field', e.target.value)}
                  className="px-2 py-1 text-xs border border-[#FFE5C4] rounded"
                />
                <input
                  placeholder="Value"
                  value={a.params.value || ''}
                  onChange={(e) => updateActionParam(i, 'value', e.target.value)}
                  className="px-2 py-1 text-xs border border-[#FFE5C4] rounded"
                />
              </div>
            )}
          </div>
        ))}
      </Modal>
    </div>
  );
}

/* -------------------- HSN Codes -------------------- */

function HsnTab() {
  return <PicklistsTab keyOverride="item.hsnCode" title="HSN Codes" />;
}

/* -------------------- Barcode Defaults -------------------- */

function BarcodeDefaultsTab() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#4A1D0F] mb-1">Barcode Defaults</h2>
      <p className="text-sm text-[#A0522D] mb-4">
        Configure default barcode generation rules for new items.
      </p>
      <PicklistsTab keyOverride="barcode.format" title="Available Barcode Formats" />
    </div>
  );
}

/* -------------------- E-Way Defaults -------------------- */

function EwayDefaultsTab() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#4A1D0F] mb-1">E-Way Bill Defaults</h2>
      <p className="text-sm text-[#A0522D] mb-4">
        Pre-fill consignor details and transport configuration for E-Way Bills.
      </p>
      <PicklistsTab keyOverride="eway.consignor" title="Saved Consignors" />
    </div>
  );
}

/* -------------------- Integrations -------------------- */

function InvIntegrationsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/integrations?app=inventory').then((r) => r.json());
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
      <h2 className="text-lg font-semibold text-[#4A1D0F] mb-1">Integrations</h2>
      <p className="text-sm text-[#A0522D] mb-4">Connect shipping, logistics and third-party services.</p>
      {loading ? <div className="text-[#A0522D]">Loading…</div> : items.length === 0 ? (
        <div className="text-[#A0522D] text-center py-8">No integrations configured. Run seed-defaults to create default integrations.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((i) => (
            <div key={i._id} className="border border-[#FFE5C4] rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[#4A1D0F]">{i.name}</span>
                <button onClick={() => toggle(i)} className={`px-2 py-0.5 text-xs rounded ${i.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{i.active ? 'ON' : 'OFF'}</button>
              </div>
              <div className="text-xs text-[#A0522D] mb-1">{i.type} {i.app === 'global' ? '(Global)' : ''}</div>
              {i.description && <p className="text-xs text-[#6B2410]">{i.description}</p>}
              {i.isDefault && <Badge tone="fire">Default</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- App Connections -------------------- */

function InvConnectionsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [src, tgt] = await Promise.all([
      fetch('/api/connections?sourceApp=inventory').then((r) => r.json()),
      fetch('/api/connections?targetApp=inventory').then((r) => r.json()),
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
      <h2 className="text-lg font-semibold text-[#4A1D0F] mb-1">App Connections</h2>
      <p className="text-sm text-[#A0522D] mb-4">Cross-module data flows involving Inventory.</p>
      {loading ? <div className="text-[#A0522D]">Loading…</div> : items.length === 0 ? (
        <div className="text-[#A0522D] text-center py-8">No connections configured. Run seed-defaults to create default connections.</div>
      ) : (
        <div className="bg-white border border-[#FFE5C4] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410]">
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
                <tr key={c._id} className="border-t border-[#FFF1D6] hover:bg-[#FFF6E5]">
                  <td className="px-4 py-2">
                    <div className="font-medium text-[#4A1D0F]">{c.name}</div>
                    {c.description && <div className="text-[10px] text-[#A0522D]">{c.description}</div>}
                  </td>
                  <td className="px-4 py-2 text-xs text-[#6B2410]">{c.sourceApp} / {c.sourceObject} / {c.sourceEvent}</td>
                  <td className="px-4 py-2 text-xs text-[#6B2410]">{c.targetApp} / {c.targetAction}</td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => toggle(c)} className={`px-2 py-0.5 text-xs rounded ${c.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{c.active ? 'ON' : 'OFF'}</button>
                  </td>
                  <td className="px-4 py-2 text-right text-[#A0522D]">{c.runCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
