'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader, Modal, Field, TextInput, TextArea, SelectInput,
  PrimaryButton, SecondaryButton, Badge, fmtINR,
} from '../_components/ui';

type BOMItem = {
  materialName: string;
  materialId?: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  notes?: string;
};

type BOM = {
  _id: string;
  name: string;
  productName: string;
  version: string;
  status: string;
  items: BOMItem[];
  totalCost: number;
  description?: string;
  createdAt?: string;
};

const STATUSES = ['Draft', 'Active', 'Obsolete'];

const STATUS_TONE: Record<string, any> = {
  Draft: 'gray',
  Active: 'green',
  Obsolete: 'red',
};

function emptyForm(): any {
  return {
    name: '',
    productName: '',
    version: '1.0',
    status: 'Draft',
    description: '',
    items: [],
  };
}

function emptyItem(): BOMItem {
  return { materialName: '', quantity: 0, unit: 'pcs', costPerUnit: 0, notes: '' };
}

export default function BOMPage() {
  const [items, setItems] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BOM | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/manufacturing/bom?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const startCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };

  const startEdit = (bom: BOM) => {
    setEditing(bom);
    setForm({ ...bom, items: bom.items?.length ? bom.items : [] });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.productName) return;
    const bomItems = (form.items || []).map((it: any) => ({
      ...it,
      quantity: Number(it.quantity) || 0,
      costPerUnit: Number(it.costPerUnit) || 0,
    }));
    const totalCost = bomItems.reduce((s: number, it: any) => s + it.quantity * it.costPerUnit, 0);
    const payload = { ...form, items: bomItems, totalCost };

    let res: Response;
    if (editing) {
      res = await fetch('/api/manufacturing/bom', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...payload }),
      });
    } else {
      res = await fetch('/api/manufacturing/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Could not save');
      return;
    }
    setOpen(false);
    setForm(emptyForm());
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this BOM?')) return;
    const res = await fetch(`/api/manufacturing/bom?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Could not delete');
      return;
    }
    load();
  };

  // Item row management
  const addItem = () => setForm({ ...form, items: [...(form.items || []), emptyItem()] });
  const updateItem = (i: number, patch: any) =>
    setForm({ ...form, items: form.items.map((it: any, idx: number) => (idx === i ? { ...it, ...patch } : it)) });
  const removeItem = (i: number) =>
    setForm({ ...form, items: form.items.filter((_: any, idx: number) => idx !== i) });

  const calcTotal = () =>
    (form.items || []).reduce((s: number, it: any) => s + (Number(it.quantity) || 0) * (Number(it.costPerUnit) || 0), 0);

  return (
    <>
      <PageHeader
        title="Bill of Materials"
        subtitle="Manufacturing"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search BOM name, product..."
              className="px-3 py-1.5 text-sm border border-[#E5E7EB] rounded focus:border-[#4A4E54] focus:outline-none"
            />
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
            <PrimaryButton onClick={startCreate}>+ New BOM</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F3F4F6] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Product</th>
                <th className="text-left px-4 py-2.5">Version</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Items</th>
                <th className="text-right px-4 py-2.5">Total Cost</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6B7280]">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6B7280]">No BOMs yet.</td></tr>
              ) : items.map((bom) => (
                <tr key={bom._id} className="border-t border-[#E5E7EB] hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2 font-medium text-[#1C1C1E]">{bom.name}</td>
                  <td className="px-4 py-2 text-[#4A4E54]">{bom.productName}</td>
                  <td className="px-4 py-2 text-[#6B7280]">v{bom.version}</td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[bom.status] || 'gray'}>{bom.status}</Badge></td>
                  <td className="px-4 py-2 text-right text-[#4A4E54]">{bom.items?.length || 0}</td>
                  <td className="px-4 py-2 text-right text-[#1C1C1E] font-medium">{fmtINR(bom.totalCost)}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(bom)} className="text-xs text-[#D4A843] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(bom._id)} className="text-xs text-red-600 hover:underline">Delete</button>
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
        title={editing ? `Edit BOM: ${editing.name}` : 'New Bill of Materials'}
        width="max-w-3xl"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="BOM Name" required>
            <TextInput value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Product Name" required>
            <TextInput value={form.productName || ''} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </Field>
          <Field label="Version">
            <TextInput value={form.version || ''} onChange={(e) => setForm({ ...form, version: e.target.value })} />
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
          </Field>
        </div>
        <Field label="Description">
          <TextArea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>

        {/* BOM Items */}
        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1C1C1E]">Materials</h3>
          <button onClick={addItem} className="text-xs text-[#D4A843] hover:underline">+ Add Material</button>
        </div>
        {(form.items || []).length === 0 && (
          <div className="text-sm text-[#6B7280] py-4 text-center border border-dashed border-[#E5E7EB] rounded mb-3">
            No materials added yet. Click &quot;+ Add Material&quot; to begin.
          </div>
        )}
        {(form.items || []).map((it: any, i: number) => (
          <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
            <div className="col-span-4">
              {i === 0 && <div className="text-[10px] uppercase text-[#6B7280] mb-1">Material Name</div>}
              <TextInput
                placeholder="Material name"
                value={it.materialName || ''}
                onChange={(e) => updateItem(i, { materialName: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              {i === 0 && <div className="text-[10px] uppercase text-[#6B7280] mb-1">Qty</div>}
              <TextInput
                type="number"
                placeholder="Qty"
                value={it.quantity}
                onChange={(e) => updateItem(i, { quantity: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              {i === 0 && <div className="text-[10px] uppercase text-[#6B7280] mb-1">Unit</div>}
              <TextInput
                placeholder="Unit"
                value={it.unit || ''}
                onChange={(e) => updateItem(i, { unit: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              {i === 0 && <div className="text-[10px] uppercase text-[#6B7280] mb-1">Cost/Unit</div>}
              <TextInput
                type="number"
                placeholder="Cost"
                value={it.costPerUnit}
                onChange={(e) => updateItem(i, { costPerUnit: e.target.value })}
              />
            </div>
            <div className="col-span-1 text-right text-xs text-[#4A4E54] py-1.5">
              {fmtINR((Number(it.quantity) || 0) * (Number(it.costPerUnit) || 0))}
            </div>
            <div className="col-span-1 text-right">
              <button onClick={() => removeItem(i)} className="text-red-600 text-sm hover:text-red-800">x</button>
            </div>
          </div>
        ))}
        {(form.items || []).length > 0 && (
          <div className="flex justify-end mt-3 pt-3 border-t border-[#E5E7EB]">
            <div className="text-sm font-semibold text-[#1C1C1E]">
              Total Cost: <span className="text-[#D4A843]">{fmtINR(calcTotal())}</span>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
