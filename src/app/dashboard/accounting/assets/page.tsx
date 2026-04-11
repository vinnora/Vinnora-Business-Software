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
  fmtINR,
} from '../_components/ui';

type Asset = {
  _id: string;
  assetName: string;
  assetNumber: string;
  category: string;
  originalCost: number;
  depreciation: number;
  bookValue: number;
  purchaseDate: string;
  usefulLife: number;
  depreciationMethod: string;
  status: string;
  condition: string;
  location?: string;
  assignedTo?: string;
};

const STATUSES = ['active', 'inactive', 'disposed', 'pending-disposal'];
const STATUS_TONE: Record<string, any> = {
  active: 'green',
  inactive: 'gray',
  disposed: 'red',
  'pending-disposal': 'amber',
};
const METHODS = ['straight-line', 'declining-balance', 'units-of-production'];
const CONDITIONS = ['excellent', 'good', 'fair', 'poor'];

export default function AssetsPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    purchaseDate: new Date().toISOString().slice(0, 10),
    usefulLife: 5,
    depreciationMethod: 'straight-line',
    condition: 'good',
    salvageValue: 0,
  });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/accounting/assets?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [statusFilter]);

  const save = async () => {
    if (!form.assetName || !form.category || !form.originalCost) return;
    await fetch('/api/accounting/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        originalCost: Number(form.originalCost),
        usefulLife: Number(form.usefulLife),
        salvageValue: Number(form.salvageValue),
      }),
    });
    setOpen(false);
    setForm({
      purchaseDate: new Date().toISOString().slice(0, 10),
      usefulLife: 5,
      depreciationMethod: 'straight-line',
      condition: 'good',
      salvageValue: 0,
    });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/accounting/assets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, status }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this asset?')) return;
    await fetch(`/api/accounting/assets?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <PageHeader
        title="Fixed Assets"
        subtitle="Asset Tracking"
        count={items.length}
        actions={
          <>
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </SelectInput>
            <PrimaryButton onClick={() => setOpen(true)}>+ New Asset</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Tile label="Original Cost" value={fmtINR(items.reduce((s, a) => s + a.originalCost, 0))} />
          <Tile label="Depreciation" value={fmtINR(items.reduce((s, a) => s + a.depreciation, 0))} />
          <Tile label="Book Value" value={fmtINR(items.reduce((s, a) => s + a.bookValue, 0))} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5">Asset #</th>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Category</th>
                <th className="text-right px-4 py-2.5">Cost</th>
                <th className="text-right px-4 py-2.5">Depr.</th>
                <th className="text-right px-4 py-2.5">Book Value</th>
                <th className="text-left px-4 py-2.5">Method</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No assets yet.</td></tr>
              ) : items.map((a) => (
                <tr key={a._id} className="border-t border-gray-100 hover:bg-emerald-50/30">
                  <td className="px-4 py-2 font-mono text-xs text-gray-600">{a.assetNumber}</td>
                  <td className="px-4 py-2 font-medium text-emerald-800">{a.assetName}</td>
                  <td className="px-4 py-2 text-gray-600">{a.category}</td>
                  <td className="px-4 py-2 text-right">{fmtINR(a.originalCost)}</td>
                  <td className="px-4 py-2 text-right text-red-600">−{fmtINR(a.depreciation)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{fmtINR(a.bookValue)}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">{a.depreciationMethod}</td>
                  <td className="px-4 py-2">
                    <select value={a.status} onChange={(e) => updateStatus(a._id, e.target.value)} className="text-xs border-0 rounded px-1 py-0.5 bg-white">
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => remove(a._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Register Asset"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Asset Name" required>
            <TextInput value={form.assetName || ''} onChange={(e) => setForm({ ...form, assetName: e.target.value })} />
          </Field>
          <Field label="Category" required>
            <TextInput value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field label="Original Cost (₹)" required>
            <TextInput type="number" value={form.originalCost || ''} onChange={(e) => setForm({ ...form, originalCost: e.target.value })} />
          </Field>
          <Field label="Salvage Value (₹)">
            <TextInput type="number" value={form.salvageValue} onChange={(e) => setForm({ ...form, salvageValue: e.target.value })} />
          </Field>
          <Field label="Purchase Date" required>
            <TextInput type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </Field>
          <Field label="Useful Life (years)" required>
            <TextInput type="number" value={form.usefulLife} onChange={(e) => setForm({ ...form, usefulLife: e.target.value })} />
          </Field>
          <Field label="Depreciation Method">
            <SelectInput value={form.depreciationMethod} onChange={(e) => setForm({ ...form, depreciationMethod: e.target.value })}>
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </SelectInput>
          </Field>
          <Field label="Condition">
            <SelectInput value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </SelectInput>
          </Field>
          <Field label="Location">
            <TextInput value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Assigned To">
            <TextInput value={form.assignedTo || ''} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 border-l-4 border-l-emerald-500 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
